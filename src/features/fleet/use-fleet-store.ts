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
}

function loadPersistedRole(): DashboardRole {
  const role = kvStorage.getString(STORAGE_KEYS.DASHBOARD_ROLE);
  return role === 'owner' ? 'owner' : 'driver';
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
}));

export const useFleetStore = createSelectors(_useFleetStore);
