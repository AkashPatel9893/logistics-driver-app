import { create } from 'zustand';

import { createSelectors } from '@/lib/create-selectors';
import { kvStorage, STORAGE_KEYS } from '@/lib/storage';

import type { DashboardRole } from './types';

interface FleetUIState {
  dashboardRole: DashboardRole;
  selectedVehicleId: string | null;
  activeDriverVehicleId: string | null;
  setDashboardRole: (role: DashboardRole) => void;
  setSelectedVehicleId: (id: string | null) => void;
  setActiveDriverVehicleId: (id: string | null) => void;
  /** Forget the account's choices (log out). */
  reset: () => void;
}

function loadPersistedRole(): DashboardRole {
  const role = kvStorage.getString(STORAGE_KEYS.DASHBOARD_ROLE);
  return role === 'owner' ? 'owner' : 'driver';
}

/** The role this phone was last switched to, or null when it was never chosen. */
export function getSavedDashboardRole(): DashboardRole | null {
  const role = kvStorage.getString(STORAGE_KEYS.DASHBOARD_ROLE);
  return role === 'owner' || role === 'driver' ? role : null;
}

const _useFleetStore = create<FleetUIState>((set) => ({
  dashboardRole: loadPersistedRole(),
  selectedVehicleId: null,
  activeDriverVehicleId: null,

  setDashboardRole: (role: DashboardRole) => {
    kvStorage.setString(STORAGE_KEYS.DASHBOARD_ROLE, role);
    set({ dashboardRole: role });
  },

  setSelectedVehicleId: (id: string | null) => set({ selectedVehicleId: id }),

  setActiveDriverVehicleId: (id: string | null) => set({ activeDriverVehicleId: id }),

  // The mode belongs to the account, not the phone: sent with the next login it would overwrite
  // another account's. The backend returns each account's own saved mode.
  reset: () => {
    kvStorage.delete(STORAGE_KEYS.DASHBOARD_ROLE);
    set({ dashboardRole: 'driver', selectedVehicleId: null, activeDriverVehicleId: null });
  },
}));

export const useFleetStore = createSelectors(_useFleetStore);
