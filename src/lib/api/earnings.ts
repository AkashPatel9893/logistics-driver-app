import { getUser } from '@/lib/auth/utils';
import { storage } from '@/lib/storage';

import { ApiError } from './api-error';
import { request } from './client';
import { jobsApi } from './jobs';
import type { DriverWallet, EarningsPeriod, EarningsSummary, TripSummary } from './models';

export const earningsApi = {
  getSummary: async (period: EarningsPeriod, signal?: AbortSignal): Promise<EarningsSummary> => {
    const res = await request<any>({ url: '/partner/earnings', params: { period }, signal });
    const summary = res.summary;
    return {
      period,
      from: summary.from_date,
      to: summary.to_date,
      trips: summary.trips_count,
      totalEarnings: Number(summary.total_net_earnings),
      tripEarnings: Number(summary.total_net_earnings) - Number(summary.incentives),
      incentives: Number(summary.incentives),
      cashCollected: Number(summary.cash_collected),
      paidToFleet: Number(summary.paid_to_fleet ?? 0),
      onlineMinutes: summary.online_minutes,
      buckets: summary.daily.map((day: { date: string; amount: string | number }) => ({
        label: day.date.slice(5),
        amount: Number(day.amount),
      })),
    };
  },

  getWallet: async (signal?: AbortSignal): Promise<DriverWallet> => {
    const [res, txs] = await Promise.all([
      request<any>({ url: '/wallet', signal }),
      request<any[]>({ url: '/wallet/transactions', signal }),
    ]);
    return {
      balance: Number(res.balance),
      transactions: txs.map((t: any) => ({
        id: t.id,
        kind: t.kind,
        title: t.title,
        amount: Number(t.amount),
        createdAt: t.created_at,
        // The backend's own transaction title already names the order; never invent a number from the id.
        orderNumber: null,
        orderId: t.order_id ?? null,
      })),
    };
  },

  getPayouts: (signal?: AbortSignal) =>
    request<
      {
        id: string;
        payout_reference: string;
        net_amount: string;
        status: string;
        paid_at: string | null;
        period_end: string;
      }[]
    >({ url: '/partner/payouts', signal }),

  requestPayout: async (amount: number): Promise<void> => {
    const user = getUser();
    if (!user) throw new ApiError('Please sign in again before withdrawing.', 'unknown');
    const storageKey = `pending_payout:${user.id}`;
    const saved = storage.getString(storageKey);
    const pending = saved ? (JSON.parse(saved) as { amount: number; key: string }) : null;
    if (pending && pending.amount !== amount) {
      throw new ApiError(
        'A previous withdrawal has an unknown status. Contact support before trying again.',
        'unknown',
      );
    }
    const key =
      pending?.key ??
      `payout-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    if (!pending) storage.set(storageKey, JSON.stringify({ amount, key }));
    try {
      await request<any>({
        method: 'POST',
        url: '/partner/payouts',
        data: { amount },
        headers: { 'Idempotency-Key': key },
      });
      storage.remove(storageKey);
    } catch (error) {
      // Preserve the key for uncertain outcomes so a retry cannot pay twice.
      if (
        error instanceof ApiError &&
        error.status !== null &&
        error.status >= 400 &&
        error.status < 500 &&
        ![408, 409, 429].includes(error.status)
      ) {
        storage.remove(storageKey);
      }
      throw error;
    }
  },

  getTrips: async (signal?: AbortSignal): Promise<TripSummary[]> => {
    const res = await request<any>({ url: '/partner/earnings', signal });
    const items: any[] = res.items ?? [];
    // The earnings list carries amounts only; the route and order number live on the job record.
    // Only the latest are looked up, so opening the tab stays a handful of cheap calls.
    const detailed = await Promise.allSettled(
      items.slice(0, 15).map((item) => jobsApi.getJob(String(item.order_id), signal)),
    );
    return items.map((item, index) => {
      const job = detailed[index]?.status === 'fulfilled' ? detailed[index].value : null;
      return {
        id: item.trip_id,
        orderId: String(item.order_id),
        number: String(item.trip_id).slice(0, 6).toUpperCase(),
        status: item.status,
        driverEarning: Number(item.net_amount),
        grossEarning: Number(item.gross_amount),
        commissionRate: Number(item.commission_rate),
        commission: Number(item.commission_deduction),
        endedAt: item.calculated_at,
        paidTo: item.paid_to,
        fleetName: item.fleet_name,
        orderNumber: job?.number ?? null,
        pickupLabel: job?.pickup.label ?? null,
        dropLabel: job?.drop.label ?? null,
        distanceKm: job?.tripDistanceKm ?? null,
      };
    });
  },
};
