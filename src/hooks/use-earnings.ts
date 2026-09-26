import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { earningsApi } from '@/lib/api/earnings';
import type { EarningsPeriod } from '@/lib/api/models';
import { queryKeys } from '@/lib/queries/keys';

export function useEarnings(period: EarningsPeriod) {
  return useQuery({
    queryKey: queryKeys.earnings(period),
    queryFn: ({ signal }) => earningsApi.getSummary(period, signal),
  });
}

export function useWallet() {
  return useQuery({
    queryKey: queryKeys.wallet,
    queryFn: ({ signal }) => earningsApi.getWallet(signal),
  });
}

export function useRequestPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => earningsApi.requestPayout(amount),
    onSuccess: (wallet) => {
      queryClient.setQueryData(queryKeys.wallet, wallet);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

export function useTrips() {
  return useQuery({
    queryKey: queryKeys.trips,
    queryFn: ({ signal }) => earningsApi.getTrips(signal),
  });
}
