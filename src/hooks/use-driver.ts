import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { driverApi } from '@/lib/api/driver';
import type { BankInput, DriverProfile, KycInput, VehicleInput } from '@/lib/api/models';
import { queryKeys } from '@/lib/queries/keys';

export function useDriverProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: ({ signal }) => driverApi.getProfile(signal),
  });
}

/** Mutations that return the updated profile write it straight into the cache. */
function useProfileMutation<TInput>(mutationFn: (input: TInput) => Promise<DriverProfile>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (profile) => queryClient.setQueryData(queryKeys.profile, profile),
  });
}

export function useSetOnline() {
  return useProfileMutation((isOnline: boolean) => driverApi.setOnline(isOnline));
}

export function useSaveVehicle() {
  return useProfileMutation((input: VehicleInput) => driverApi.saveVehicle(input));
}

export function useSaveKyc() {
  return useProfileMutation((input: KycInput) => driverApi.saveKyc(input));
}

export function useSaveBank() {
  return useProfileMutation((input: BankInput) => driverApi.saveBank(input));
}

export function useMarkWelcomeBonusSeen() {
  return useProfileMutation(() => driverApi.markWelcomeBonusSeen());
}

export function useVehicleTypes() {
  return useQuery({
    queryKey: queryKeys.vehicleTypes,
    queryFn: ({ signal }) => driverApi.getVehicleTypes(signal),
    staleTime: 1000 * 60 * 60,
  });
}

export function useSubmitDailyCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoUrl: string) => driverApi.submitDailyCheck(photoUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
      queryClient.invalidateQueries({ queryKey: ['driver', 'earnings'] });
    },
  });
}
