import { request } from './client';
import type { DriverWallet, EarningsPeriod, EarningsSummary, TripSummary } from './models';

export const earningsApi = {
  getSummary: (period: EarningsPeriod, signal?: AbortSignal) =>
    request<EarningsSummary>({ url: '/driver/earnings', params: { period }, signal }),

  getWallet: (signal?: AbortSignal) => request<DriverWallet>({ url: '/driver/wallet', signal }),

  requestPayout: (amount: number) =>
    request<DriverWallet>({ method: 'POST', url: '/driver/wallet/payouts', data: { amount } }),

  getTrips: (signal?: AbortSignal) => request<TripSummary[]>({ url: '/driver/trips', signal }),
};
