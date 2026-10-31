import { getUser } from '@/lib/auth/utils';
import { storage } from '@/lib/storage';

import { ApiError } from './api-error';
import { request } from './client';
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
        orderNumber: t.order_id ? `ORD-${String(t.order_id).slice(0, 6)}` : null,
      })),
    };
  },

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
    return res.items.map((item: any) => ({
      id: item.trip_id,
      number: String(item.trip_id).slice(0, 6).toUpperCase(),
      status: item.status,
      driverEarning: Number(item.net_amount),
      endedAt: item.calculated_at,
      paidTo: item.paid_to,
      fleetName: item.fleet_name,
    }));
  },
};
