import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { driverApi } from '@/lib/api/driver';
import {
  onboardingApi,
  type DocumentInput,
  type OwnerAuthorization,
  type PartnerVehicle,
} from '@/lib/api/onboarding';
import type { BankInput, DriverProfile, Gender, VehicleInput } from '@/lib/api/models';
import { queryKeys } from '@/lib/queries/keys';

export function useDriverProfile(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: ({ signal }) => driverApi.getProfile(signal),
    enabled: options.enabled ?? true,
  });
}

/** Mutations that return the updated profile write it straight into the cache. */
function useProfileMutation<TInput>(mutationFn: (input: TInput) => Promise<DriverProfile>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile, profile);
      // The Documents screen reads the light onboarding status instead of the profile.
      queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus });
    },
  });
}

export function useSetOnline() {
  return useProfileMutation((isOnline: boolean) => driverApi.setOnline(isOnline));
}

export function useSaveVehicle() {
  return useProfileMutation((input: VehicleInput) => driverApi.saveVehicle(input));
}

export function useUpdateGender() {
  return useProfileMutation((gender: Gender) => driverApi.updateGender(gender));
}

export function useSaveBank() {
  return useProfileMutation((input: BankInput) => driverApi.saveBank(input));
}

export function useSubmitOnboarding() {
  return useProfileMutation(() => driverApi.submitOnboarding());
}

export function useVehicleTypes() {
  return useQuery({
    queryKey: queryKeys.vehicleTypes,
    queryFn: ({ signal }) => driverApi.getVehicleTypes(signal),
    staleTime: 1000 * 60 * 60,
  });
}

export interface VehicleDocumentInfo {
  type: string;
  status: string;
  /** ISO date, when the document has one. */
  expiryDate: string | null;
}

/** Every vehicle the driver has now: their own and any a fleet owner assigned. */
/** NOC upload and owner OTP for a vehicle someone else owns; refreshes the vehicle and the steps. */
export function useOwnerPermission(vehicleId: string) {
  const queryClient = useQueryClient();
  // The answer is the updated permission: show it at once, then refetch the rest.
  const refresh = (auth: OwnerAuthorization) => {
    queryClient.setQueryData<PartnerVehicle[]>(queryKeys.myVehicles, (list) =>
      list?.map((v) => (v.id === vehicleId ? { ...v, owner_authorization: auth } : v)),
    );
    queryClient.invalidateQueries({ queryKey: queryKeys.myVehicles });
    queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus });
    queryClient.invalidateQueries({ queryKey: queryKeys.profile });
  };
  return {
    uploadNoc: useMutation({
      mutationFn: (fileUri: string) => onboardingApi.uploadOwnerNoc(vehicleId, fileUri),
      onSuccess: refresh,
    }),
    requestOtp: useMutation({ mutationFn: () => onboardingApi.requestOwnerOtp(vehicleId) }),
    verifyOtp: useMutation({
      mutationFn: (code: string) => onboardingApi.verifyOwnerOtp(vehicleId, code),
      onSuccess: refresh,
    }),
  };
}

export function useMyVehicles(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.myVehicles,
    enabled: options.enabled ?? true,
    queryFn: ({ signal }) => onboardingApi.listVehicles(signal),
  });
}

/** Changes which approved vehicle the driver uses. The backend refuses while online or on a trip. */
export function useSwitchVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: string) => onboardingApi.setActiveVehicle(vehicleId),
    // Awaited, so the screen never shows the old vehicle as in use after the switch.
    onSuccess: () =>
      Promise.all(
        [queryKeys.profile, queryKeys.myVehicles, queryKeys.onboardingStatus].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

/** Sends one of the rider's vehicle papers (e.g. fitness, permit), then refreshes what depends on it. */
export function useSubmitVehicleDocument(vehicleId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DocumentInput) => onboardingApi.submitVehicleDocument(vehicleId!, input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', 'vehicle-documents', vehicleId ?? ''] });
      queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

export function useVehicleDocuments(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['driver', 'vehicle-documents', vehicleId ?? ''],
    enabled: Boolean(vehicleId),
    queryFn: async (): Promise<VehicleDocumentInfo[]> => {
      const docs = await onboardingApi.listVehicleDocuments(vehicleId!);
      return (docs ?? []).map((d: any) => ({
        type: d.document_type,
        status: d.verification_status,
        expiryDate: d.expiry_date ?? null,
      }));
    },
  });
}
