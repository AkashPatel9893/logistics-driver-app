import type { QueryClient } from '@tanstack/react-query';
import type { useRouter } from 'expo-router';

import { driverApi } from '@/lib/api/driver';
import { onboardingApi } from '@/lib/api/onboarding';
import { goBack } from '@/lib/go-back';
import { queryKeys } from '@/lib/queries/keys';

import {
  buildRegistrationSteps,
  fetchDriverDocuments,
  isStepDone,
  snapshotFromStatus,
} from './use-registration';
import { useRegistrationStore } from './use-registration-store';

/**
 * After a registration step is done, opens the next unfinished one in its place, so the driver
 * goes through the steps one after another; back to Documents once nothing is left.
 *
 * Looks forward from the step just finished (then wraps round), never at that step itself: a step
 * the backend has not marked complete yet (e.g. waiting for a fleet owner) can't loop back.
 */
export async function goToNextStep(
  router: ReturnType<typeof useRouter>,
  queryClient: QueryClient,
  currentStepId: string,
): Promise<void> {
  try {
    const [status, docs, vehicleTypes] = await Promise.all([
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
    ]);
    const { vehicleTypeId, fleetDriver } = useRegistrationStore.getState();
    const steps = buildRegistrationSteps(
      snapshotFromStatus(status),
      docs,
      vehicleTypes,
      vehicleTypeId,
      fleetDriver,
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
  goBack(router);
}
