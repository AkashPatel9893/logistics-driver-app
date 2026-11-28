/** Requests behind driver registration. The rules that turn them into steps: registration-steps.ts. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { onboardingApi, type DocumentInput } from '@/lib/api/onboarding';
import { rejectionMessage } from '@/lib/api/rejection-reason';
import { queryKeys } from '@/lib/queries/keys';

import type { DriverDocument, FleetAssignedVehicle } from './registration-steps';

export async function fetchDriverDocuments({
  signal,
}: {
  signal?: AbortSignal;
}): Promise<DriverDocument[]> {
  const docs = await onboardingApi.listDocuments(signal);
  return (docs ?? []).map((d) => ({
    id: d.id,
    type: d.document_type,
    identifierMasked: d.identifier_masked ?? null,
    expiryDate: d.expiry_date ?? null,
    status: d.verification_status,
    rejectionReason: rejectionMessage(d.rejection_reason),
  }));
}

export function useDriverDocuments() {
  return useQuery({ queryKey: queryKeys.driverDocuments, queryFn: fetchDriverDocuments });
}

/** Submits one driver document (create, upload front/back, verify), then refreshes the steps. */
export function useSubmitDriverDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DocumentInput) => onboardingApi.submitDriverDocument(input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.driverDocuments });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus });
    },
  });
}

export function useOnboardingStatus() {
  return useQuery({
    queryKey: queryKeys.onboardingStatus,
    queryFn: ({ signal }) => onboardingApi.getStatus(signal),
  });
}

/**
 * The server says how a vehicle relates to the driver (`relationship_type`); a fleet one means the
 * owner added this driver, so the driver is not asked for a vehicle of their own. The exact values
 * are not documented yet, so anything that names a fleet counts.
 */
export async function fetchFleetAssignedVehicle(): Promise<FleetAssignedVehicle | null> {
  const list = await onboardingApi.listVehicles().catch(() => []);
  const vehicle = list.find((v) => /FLEET/i.test(v.relationship_type));
  return vehicle
    ? { typeCode: vehicle.vehicle_type_code, plate: vehicle.registration_number }
    : null;
}

export function useFleetAssignedVehicle() {
  return useQuery({
    queryKey: queryKeys.fleetAssignedVehicle,
    queryFn: fetchFleetAssignedVehicle,
  });
}
