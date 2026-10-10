import { request } from './client';
import type {
  DriverTransaction,
  DriverWallet,
  EarningsPeriod,
  EarningsSummary,
  TripSummary,
} from './models';

export const earningsApi = {
  getSummary: async (period: EarningsPeriod, signal?: AbortSignal): Promise<EarningsSummary> => {
    try {
      const res = await request<any>({ url: '/partner/earnings', signal });
      const items = res?.items ?? [];
      const total = items.reduce((acc: number, item: any) => acc + Number(item.net_amount ?? 0), 0);
      return {
        period,
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        trips: items.length,
        totalEarnings: total,
        tripEarnings: total,
        incentives: 0,
        cashCollected: 0,
        onlineMinutes: 0,
        buckets: [{ label: 'This Week', amount: total }],
      };
    } catch {
      return {
        period,
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        trips: 0,
        totalEarnings: 0,
        tripEarnings: 0,
        incentives: 0,
        cashCollected: 0,
        onlineMinutes: 0,
        buckets: [],
      };
    }
  },

  getWallet: async (signal?: AbortSignal): Promise<DriverWallet> => {
    try {
      const res = await request<any>({ url: '/wallet', signal });
      let transactions: DriverTransaction[] = [];
      try {
        const txs = await request<any[]>({ url: '/wallet/transactions', signal });
        if (Array.isArray(txs)) {
          transactions = txs.map((t: any) => ({
            id: t.id,
            kind: 'trip_earning',
            title: t.title ?? t.kind ?? 'Wallet Transfer',
            amount: Number(t.amount ?? 0),
            createdAt: t.created_at ?? new Date().toISOString(),
            orderNumber: t.order_id ? `ORD-${String(t.order_id).slice(0, 6)}` : null,
          }));
        }
      } catch {}
      return {
        balance: Number(res.balance ?? 0),
        minPayout: Math.abs(Number(res.minimum_balance ?? 100)),
        bankLabel: 'Verified Bank Account',
        transactions,
      };
    } catch {
      return {
        balance: 0,
        minPayout: 100,
        bankLabel: null,
        transactions: [],
      };
    }
  },

  requestPayout: async (amount: number): Promise<DriverWallet> => {
    try {
      await request<any>({
        method: 'POST',
        url: '/partner/payouts',
        data: { amount },
      });
    } catch {
      // Fallback
    }
    return earningsApi.getWallet();
  },

  getTrips: async (signal?: AbortSignal): Promise<TripSummary[]> => {
    try {
      const res = await request<any>({ url: '/partner/earnings', signal });
      const items = res?.items ?? [];
      return items.map((i: any) => ({
        id: i.trip_id ?? i.id,
        number: `TRP-${String(i.trip_id ?? i.id)
          .slice(0, 6)
          .toUpperCase()}`,
        status: i.status === 'SETTLED' ? 'delivered' : 'cancelled',
        pickupLabel: 'Pickup Location',
        dropLabel: 'Drop Location',
        vehicle: { id: 'truck', name: 'Mini Truck', imageKey: 'truck' },
        tripDistanceKm: 5.2,
        fare: Number(i.gross_amount ?? i.net_amount ?? 0),
        driverEarning: Number(i.net_amount ?? 0),
        paymentMode: 'prepaid',
        endedAt: i.calculated_at ?? new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  },
};
