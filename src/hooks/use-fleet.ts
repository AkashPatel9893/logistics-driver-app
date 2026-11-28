import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';

import {
  fleetApi,
  type AssignDriverRequest,
  type CompanyCreateRequest,
  type CompanyUpdateRequest,
  type FleetVehicleCreateRequest,
  type FleetVehicleUpdateRequest,
  type LinkRequestCreate,
} from '@/lib/api/fleet';
import { onboardingApi, type DocumentInput } from '@/lib/api/onboarding';
import { queryKeys } from '@/lib/queries/keys';
import { toCompanyDetails, toFleetVehicle } from '@/features/fleet/types';

/**
 * Anything that moves a vehicle or a driver changes the fleet lists, and can change the owner's own
 * driver profile too (the vehicle they drive, and whether they can go online).
 */
function invalidateFleetRoster(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.fleet.vehicles });
  queryClient.invalidateQueries({ queryKey: queryKeys.fleet.drivers });
  queryClient.invalidateQueries({ queryKey: queryKeys.fleet.stats });
  queryClient.invalidateQueries({ queryKey: queryKeys.profile });
}

export function useFleetCompany() {
  return useQuery({
    queryKey: queryKeys.fleet.company,
    queryFn: async ({ signal }) => {
      const data = await fleetApi.getCompany(signal);
      return toCompanyDetails(data);
    },
  });
}

export function useRegisterCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CompanyCreateRequest) => fleetApi.registerCompany(body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.fleet.company, toCompanyDetails(data));
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.stats });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CompanyUpdateRequest) => fleetApi.updateCompany(body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.fleet.company, toCompanyDetails(data));
    },
  });
}

export function useFleetStats() {
  return useQuery({
    queryKey: queryKeys.fleet.stats,
    queryFn: ({ signal }) => fleetApi.getStats(signal),
  });
}

export function useFleetVehicles(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.fleet.vehicles,
    enabled: options.enabled ?? true,
    queryFn: async ({ signal }) => {
      const list = await fleetApi.listVehicles(signal);
      return (list ?? []).map(toFleetVehicle);
    },
  });
}

export function useFleetDrivers() {
  return useQuery({
    queryKey: queryKeys.fleet.drivers,
    queryFn: ({ signal }) => fleetApi.listDrivers(signal),
  });
}

export function useAddFleetVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: FleetVehicleCreateRequest) => fleetApi.addVehicle(body),
    // Waits for the vehicle list, so Vehicle details (opened next) already has the new one.
    onSuccess: async () => {
      invalidateFleetRoster(queryClient);
      await queryClient.refetchQueries({ queryKey: queryKeys.fleet.vehicles });
    },
  });
}

export function useSubmitFleetVehicleDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, input }: { vehicleId: string; input: DocumentInput }) =>
      fleetApi.submitVehicleDocument(vehicleId, input),
    // Also refreshes each vehicle's paper list (its key starts with the same prefix).
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.fleet.vehicles }),
  });
}

/** A fleet vehicle's papers, for the ones the vehicle list does not carry (fitness, permits). */
export function useFleetVehicleDocuments(vehicleId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.fleet.vehicles, vehicleId ?? '', 'documents'],
    enabled: Boolean(vehicleId),
    queryFn: async ({ signal }) =>
      (await fleetApi.listVehicleDocuments(vehicleId!, signal)).map((d) => ({
        type: d.document_type,
        status: d.verification_status,
        expiryDate: d.expiry_date ?? null,
      })),
  });
}

export function useAssignFleetDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ vehicleId, body }: { vehicleId: string; body: AssignDriverRequest }) => {
      const vehicle = await fleetApi.assignDriver(vehicleId, body);
      // An owner who also has their own vehicle keeps both, and the backend leaves the old one
      // active (the one used to go online). Driving this one means making it the active one.
      if (body.is_owner_self) await onboardingApi.setActiveVehicle(vehicleId);
      return vehicle;
    },
    // Settled, not success: the assignment may have gone through even if the switch then failed.
    onSettled: (_vehicle, _error, { body }) => {
      invalidateFleetRoster(queryClient);
      if (body.is_owner_self) {
        queryClient.invalidateQueries({ queryKey: queryKeys.myVehicles });
        queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus });
      }
    },
  });
}

export function useUnassignFleetDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: string) => fleetApi.unassignDriver(vehicleId),
    onSuccess: () => invalidateFleetRoster(queryClient),
  });
}

export function useRemoveFleetDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (driverOrInviteId: string) => fleetApi.removeDriver(driverOrInviteId),
    onSuccess: () => invalidateFleetRoster(queryClient),
  });
}

export function useUpdateFleetVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, body }: { vehicleId: string; body: FleetVehicleUpdateRequest }) =>
      fleetApi.updateVehicle(vehicleId, body),
    onSuccess: () => invalidateFleetRoster(queryClient),
  });
}

export function useRemoveFleetVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: string) => fleetApi.removeVehicle(vehicleId),
    onSuccess: () => invalidateFleetRoster(queryClient),
  });
}

/** Drivers waiting to join. Owners only: the backend answers 404 without a fleet company. */
export function useFleetLinkRequests(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.fleet.linkRequests,
    enabled: options.enabled ?? true,
    // A driver sends these from their own phone, so look again while a screen in front shows them.
    subscribed: useIsFocused(),
    refetchInterval: 60_000,
    queryFn: ({ signal }) => fleetApi.listPendingLinkRequests(signal),
  });
}

export function useApproveLinkRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => fleetApi.approveLinkRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.linkRequests });
      invalidateFleetRoster(queryClient);
    },
  });
}

export function useRejectLinkRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => fleetApi.rejectLinkRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.linkRequests });
    },
  });
}

export function useRequestFleetLink() {
  return useMutation({
    mutationFn: (body: LinkRequestCreate) => fleetApi.requestLink(body),
  });
}

export function useFleetTopup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ amount, idempotencyKey }: { amount: number; idempotencyKey?: string }) =>
      fleetApi.topupWallet(amount, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.wallet });
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.stats });
    },
  });
}
