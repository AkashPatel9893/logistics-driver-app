import type { QueryClient } from '@tanstack/react-query';
import type { useRouter } from 'expo-router';

import { useFleetStore } from '@/features/fleet/use-fleet-store';
import { driverApi } from '@/lib/api/driver';
import { onboardingApi } from '@/lib/api/onboarding';
import { goBack } from '@/lib/go-back';
import { queryKeys } from '@/lib/queries/keys';

import {
  buildRegistrationSteps,
  fetchDriverDocuments,
  fetchFleetAssignedVehicle,
  isStepDone,
  snapshotFromStatus,
} from './use-registration';
import { useRegistrationStore } from './use-registration-store';

// Set right after sign-up so Documents opens the first pending step at once (a new driver goes
// through the steps in a row). In memory only: opening the app later shows the list instead.
let autoStartRequested = false;

/** Asks the next Documents screen that opens to go straight to the first pending step. */
export function requestAutoStart() {
  autoStartRequested = true;
}

export function isAutoStartRequested() {
  return autoStartRequested;
}

/** Returns whether auto-start was requested, and clears it (so it happens once). */
export function takeAutoStart(): boolean {
  const requested = autoStartRequested;
  autoStartRequested = false;
  return requested;
}

/**
 * After a registration step is done, opens the next unfinished one in its place, so the driver
 * goes through the steps one after another; to Documents once nothing is left.
 *
 * Looks forward from the step just finished (then wraps round), never at that step itself: a step
 * the backend has not marked complete yet (e.g. waiting for a fleet owner) can't loop back.
 */
export async function goToNextStep(
  router: ReturnType<typeof useRouter>,
  queryClient: QueryClient,
  currentStepId: string,
): Promise<void> {
  // A fleet owner's checklist (Fleet setup) decides what is next, not the driver's step order.
  if (useFleetStore.getState().dashboardRole === 'owner') {
    goBack(router);
    return;
  }
  // Registration still in progress: when nothing is left, the Documents list is where to land.
  let registrationInProgress = false;
  try {
    const [status, docs, vehicleTypes, fleetVehicle] = await Promise.all([
      queryClient.fetchQuery({
        queryKey: queryKeys.onboardingStatus,
        queryFn: ({ signal }) => onboardingApi.getStatus(signal),
        staleTime: 0,
      }),
      queryClient.fetchQuery({
        queryKey: queryKeys.driverDocuments,
        queryFn: fetchDriverDocuments,
        staleTime: 0,
      }),
      queryClient.fetchQuery({
        queryKey: queryKeys.vehicleTypes,
        queryFn: ({ signal }) => driverApi.getVehicleTypes(signal),
        staleTime: 1000 * 60 * 60,
      }),
      queryClient.fetchQuery({
        queryKey: queryKeys.fleetAssignedVehicle,
        queryFn: fetchFleetAssignedVehicle,
        staleTime: 0,
      }),
    ]);
    registrationInProgress = snapshotFromStatus(status).onboarding.status !== 'approved';
    const { vehicleTypeId, fleetDriver } = useRegistrationStore.getState();
    const steps = buildRegistrationSteps(
      snapshotFromStatus(status),
      docs,
      vehicleTypes,
      vehicleTypeId,
      fleetDriver,
      fleetVehicle,
    );
    const index = steps.findIndex((s) => s.id === currentStepId);
    const pending = (s: (typeof steps)[number]) => s.id !== currentStepId && !isStepDone(s.state);
    const next =
      steps.slice(index + 1).find(pending) ?? steps.slice(0, Math.max(index, 0)).find(pending);
    if (next) {
      router.replace(next.route);
      return;
    }
  } catch {
    // Couldn't check what is left: Documents shows it.
  }
  // Last step done: show the Documents list (with Submit for review). Already approved, so this
  // was an edit made from Account or Wallet: back to where it came from.
  if (registrationInProgress) router.dismissTo('/registration');
  else goBack(router);
}
