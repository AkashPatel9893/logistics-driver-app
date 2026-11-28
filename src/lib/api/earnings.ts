import { getUser } from '@/lib/auth/utils';
import { storage } from '@/lib/storage';

import { ApiError } from './api-error';
import { request } from './client';
import { jobsApi } from './jobs';
import type {
  DriverWallet,
  EarningsPeriod,
  EarningsSummary,
  PayoutLimits,
  TripOutcome,
  WalletSource,
  TripSummary,
} from './models';

/** Pages read per tab and period; the rest is not shown (about 300 trips). */
const MAX_OUTCOME_PAGES = 3;

function tripAddress(stop: { label: string; houseNumber: string } | undefined): string | null {
  if (!stop) return null;
  const label = stop.label.trim();
  const houseNumber = stop.houseNumber?.trim();
  if (!houseNumber) return label || null;
  const parts = label.split(',').map((part) => part.trim().toLowerCase());
  return parts.includes(houseNumber.toLowerCase())
    ? label
    : [houseNumber, label].filter(Boolean).join(', ');
}

export type OrderWalletEntry = { id: string; kind: string; amount: number; createdAt: string };
export type OrderWallet = {
  ownerType: 'DRIVER' | 'FLEET';
  netAmount: number;
  complete: boolean;
  entries: OrderWalletEntry[];
};

export const earningsApi = {
  getSummary: async (period: EarningsPeriod, signal?: AbortSignal): Promise<EarningsSummary> => {
    const res = await request<any>({
      url: '/partner/earnings',
      params: { period, limit: 200 },
      signal,
    });
    const summary = res.summary;
    // The period summary has no tip/priority totals; the per-trip items do, so add those up.
    const sumItems = (field: 'priority_earning' | 'tip_earning') =>
      ((res.items ?? []) as any[]).reduce((total, item) => total + (Number(item[field]) || 0), 0);
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
      priorityEarnings:
        Number(summary.priority_earning ?? summary.total_priority_earning ?? 0) ||
        sumItems('priority_earning'),
      tipEarnings:
        Number(summary.tip_earning ?? summary.total_tip_earning ?? 0) || sumItems('tip_earning'),
      onlineMinutes: summary.online_minutes,
      buckets: summary.daily.map((day: { date: string; amount: string | number }) => ({
        label: day.date.slice(5),
        amount: Number(day.amount),
      })),
    };
  },

  getWallet: async (source: WalletSource, signal?: AbortSignal): Promise<DriverWallet> => {
    const base = source === 'fleet' ? '/fleet/wallet' : '/wallet';
    const [res, txs] = await Promise.all([
      request<any>({ url: base, signal }),
      request<any[]>({ url: `${base}/transactions`, signal }),
    ]);
    return {
      balance: Number(res.balance),
      ...(source === 'fleet' && res.minimum_balance != null
        ? { minimumBalance: Number(res.minimum_balance) }
        : {}),
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

  /** Every wallet movement one order caused, with the net. No balances, so it is safe to show to a fleet driver. */
  getOrderWallet: async (orderId: string, signal?: AbortSignal): Promise<OrderWallet> => {
    const res = await request<any>({ url: `/wallet/orders/${orderId}`, signal });
    return {
      ownerType: res.wallet_owner_type,
      netAmount: Number(res.net_amount),
      // False while the order's ledger entries are still being written.
      complete: Boolean(res.complete),
      entries: (res.entries as any[]).map((entry, index) => ({
        id: `${entry.kind}-${index}`,
        kind: entry.kind as string,
        amount: Number(entry.amount),
        createdAt: entry.created_at as string,
      })),
    };
  },

  getPayouts: (source: WalletSource, signal?: AbortSignal) =>
    request<
      {
        id: string;
        payout_reference: string;
        net_amount: string;
        status: string;
        paid_at: string | null;
        period_end: string;
      }[]
    >({ url: source === 'fleet' ? '/fleet/payouts' : '/partner/payouts', signal }),

  /** Admin-set transfer rules; each field is null when there is no such limit. */
  getPayoutLimits: async (signal?: AbortSignal): Promise<PayoutLimits> => {
    const res = await request<{
      transfers_left: number | null;
      transfers_per_week: number | null;
      renews_at: string | null;
      minimum_amount: string | null;
    }>({ url: '/partner/payouts/limits', signal });
    return {
      transfersLeft: res.transfers_left,
      transfersPerWeek: res.transfers_per_week,
      renewsAt: res.renews_at,
      minimumAmount: res.minimum_amount != null ? Number(res.minimum_amount) : null,
    };
  },

  /** Both go to the partner's own verified bank account; the fleet one draws on the fleet wallet. */
  requestPayout: async (amount: number, source: WalletSource = 'driver'): Promise<void> => {
    const user = getUser();
    if (!user) throw new ApiError('Please sign in again before withdrawing.', 'unknown');
    const storageKey =
      source === 'fleet' ? `pending_fleet_payout:${user.id}` : `pending_payout:${user.id}`;
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
        url: source === 'fleet' ? '/fleet/payouts' : '/partner/payouts',
        data: { amount },
        headers: { 'Idempotency-Key': key },
      });
      storage.remove(storageKey);
    } catch (error) {
      // Preserve the key for uncertain outcomes so a retry cannot pay twice. "No transfers left"
      // is a clear refusal (nothing was paid), so its key is dropped too.
      if (
        error instanceof ApiError &&
        error.status !== null &&
        error.status >= 400 &&
        error.status < 500 &&
        (![408, 409, 429].includes(error.status) || error.code === 'PAYOUT_LIMIT_REACHED')
      ) {
        storage.remove(storageKey);
      }
      throw error;
    }
  },

  getTrips: async (signal?: AbortSignal): Promise<TripSummary[]> => {
    const res = await request<any>({
      url: '/partner/earnings',
      params: { limit: 200 },
      signal,
    });
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
        priorityEarning: Number(item.priority_earning ?? 0) || 0,
        tipEarning: Number(item.tip_earning ?? 0) || 0,
        endedAt: item.calculated_at,
        paidTo: item.paid_to,
        fleetName: item.fleet_name,
        orderNumber: job?.number ?? null,
        pickupLabel: tripAddress(job?.pickup),
        dropLabel: tripAddress(job?.drop),
        distanceKm: job?.tripDistanceKm ?? null,
      };
    });
  },

  /**
   * Cancelled trips (with failed deliveries) or missed requests, newest first. `from` and `to` are
   * days (YYYY-MM-DD, inclusive) in the driver's market timezone.
   */
  getTripOutcomes: async (
    kind: TripOutcome['kind'],
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<TripOutcome[]> => {
    const items: any[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < MAX_OUTCOME_PAGES; page++) {
      const res: any = await request<any>({
        url: '/partner/trips',
        params: { status: kind.toUpperCase(), from, to, limit: 100, ...(cursor ? { cursor } : {}) },
        signal,
      });
      items.push(...(res.items ?? []));
      cursor = res.next_cursor ?? null;
      if (!cursor) break;
    }
    return items.map((item) => ({
      id: String(item.trip_id ?? item.offer_id ?? `${item.order_id}-${item.ended_at}`),
      orderNumber: String(item.order_number),
      kind,
      result: item.result ?? null,
      reason: item.cancel_reason ?? null,
      endedAt: item.ended_at,
      pickupLabel: item.pickup_label,
      dropLabel: item.drop_label,
    }));
  },
};
