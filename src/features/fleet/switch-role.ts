import { useAuthStore } from '@/features/auth/use-auth-store';
import { authApi, toPartnerRole } from '@/lib/api/auth';

import type { DashboardRole } from './types';
import { useFleetStore } from './use-fleet-store';

/**
 * Switches between Rider and Fleet Owner mode: saved on the phone at once, and sent to the backend
 * so the choice follows the account to a new phone. A failed or missing backend call is ignored.
 */
export function switchDashboardRole(role: DashboardRole): void {
  useFleetStore.getState().setDashboardRole(role);
  if (useAuthStore.getState().status === 'signIn') {
    void authApi.setActiveRole(toPartnerRole(role));
  }
}
