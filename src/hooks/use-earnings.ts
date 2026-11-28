import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { earningsApi } from '@/lib/api/earnings';
import { rateCardApi } from '@/lib/api/rate-card';
import { growthApi } from '@/lib/api/growth';
import { incentivesApi, type IncentiveType } from '@/lib/api/incentives';
import type { EarningsPeriod, TripOutcome, WalletSource } from '@/lib/api/models';
import { queryKeys } from '@/lib/queries/keys';

export function useEarnings(period: EarningsPeriod) {
  return useQuery({
    queryKey: queryKeys.earnings(period),
    queryFn: ({ signal }) => earningsApi.getSummary(period, signal),
  });
}

const walletKey = (source: WalletSource) =>
  source === 'fleet' ? queryKeys.fleet.wallet : queryKeys.wallet;
const payoutsKey = (source: WalletSource) =>
  source === 'fleet' ? queryKeys.fleet.payouts : (['driver', 'payouts'] as const);

export function useWallet(source: WalletSource = 'driver') {
  return useQuery({
    queryKey: walletKey(source),
    queryFn: ({ signal }) => earningsApi.getWallet(source, signal),
  });
}

export function usePayouts(source: WalletSource = 'driver') {
  return useQuery({
    queryKey: payoutsKey(source),
    queryFn: ({ signal }) => earningsApi.getPayouts(source, signal),
  });
}

export function usePayoutLimits() {
  return useQuery({
    queryKey: queryKeys.payoutLimits,
    queryFn: ({ signal }) => earningsApi.getPayoutLimits(signal),
  });
}

export function useRequestPayout(source: WalletSource = 'driver') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => earningsApi.requestPayout(amount, source),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletKey(source) });
      queryClient.invalidateQueries({ queryKey: payoutsKey(source) });
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

export function useTrips(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.trips,
    queryFn: ({ signal }) => earningsApi.getTrips(signal),
    enabled: options.enabled ?? true,
  });
}

/** Cancelled trips or missed requests between two days (YYYY-MM-DD, inclusive). */
export function useTripOutcomes(
  kind: TripOutcome['kind'],
  from: string,
  to: string,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.tripOutcomes(kind, from, to),
    queryFn: ({ signal }) => earningsApi.getTripOutcomes(kind, from, to, signal),
    enabled: options.enabled ?? true,
  });
}

export function useIncentives(type: IncentiveType) {
  return useQuery({
    queryKey: queryKeys.incentives(type),
    queryFn: ({ signal }) => incentivesApi.list(type, signal),
  });
}

export function useRewards(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.rewards,
    enabled: options.enabled ?? true,
    queryFn: ({ signal }) => growthApi.getRewards(signal),
  });
}

export function useReferral(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.referral,
    enabled: options.enabled ?? true,
    queryFn: ({ signal }) => growthApi.getReferral(signal),
  });
}

export function useRateCard() {
  return useQuery({
    queryKey: queryKeys.rateCard,
    queryFn: ({ signal }) => rateCardApi.get(signal),
  });
}
