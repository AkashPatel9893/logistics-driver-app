import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fleetApi,
  type AssignDriverRequest,
  type CompanyCreateRequest,
  type FleetVehicleCreateRequest,
  type LinkRequestCreate,
} from '@/lib/api/fleet';
import { queryKeys } from '@/lib/queries/keys';
import { toCompanyDetails, toFleetVehicle } from '@/features/fleet/types';

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

export function useFleetStats() {
  return useQuery({
    queryKey: queryKeys.fleet.stats,
    queryFn: ({ signal }) => fleetApi.getStats(signal),
  });
}

export function useFleetVehicles() {
  return useQuery({
    queryKey: queryKeys.fleet.vehicles,
    queryFn: async ({ signal }) => {
      const list = await fleetApi.listVehicles(signal);
      return (list ?? []).map(toFleetVehicle);
    },
  });
}

export function useAddFleetVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: FleetVehicleCreateRequest) => fleetApi.addVehicle(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.vehicles });
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.stats });
    },
  });
}

export function useAssignFleetDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, body }: { vehicleId: string; body: AssignDriverRequest }) =>
      fleetApi.assignDriver(vehicleId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.vehicles });
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.stats });
    },
  });
}

export function useUnassignFleetDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: string) => fleetApi.unassignDriver(vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.vehicles });
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.stats });
    },
  });
}

export function useRemoveFleetVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: string) => fleetApi.removeVehicle(vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.vehicles });
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.stats });
    },
  });
}

export function useFleetLinkRequests() {
  return useQuery({
    queryKey: queryKeys.fleet.linkRequests,
    queryFn: ({ signal }) => fleetApi.listPendingLinkRequests(signal),
  });
}

export function useApproveLinkRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => fleetApi.approveLinkRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.linkRequests });
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.vehicles });
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

export function useFleetWallet() {
  return useQuery({
    queryKey: queryKeys.fleet.wallet,
    queryFn: ({ signal }) => fleetApi.getWallet(signal),
  });
}

export function useFleetWalletTransactions(limit = 50) {
  return useQuery({
    queryKey: queryKeys.fleet.transactions(limit),
    queryFn: ({ signal }) => fleetApi.getWalletTransactions(limit, signal),
  });
}

export function useFleetPayouts() {
  return useQuery({
    queryKey: queryKeys.fleet.payouts,
    queryFn: ({ signal }) => fleetApi.listPayouts(signal),
  });
}

export function useFleetWithdraw() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ amount, idempotencyKey }: { amount: number; idempotencyKey?: string }) =>
      fleetApi.withdraw(amount, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.wallet });
      queryClient.invalidateQueries({ queryKey: queryKeys.fleet.payouts });
    },
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
