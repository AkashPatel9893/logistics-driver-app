import { create } from 'zustand';

import { createSelectors } from '@/lib/create-selectors';
import { kvStorage, STORAGE_KEYS } from '@/lib/storage';

import type { CompanyDetails, DashboardRole, FleetDriver, FleetVehicle } from './types';

export const DEFAULT_COMPANY: CompanyDetails = {
  companyName: 'Company Name',
  ownerName: "Owner's Name",
  phone: '+91 98765 43210',
  email: 'owner@ryno.app',
  companyType: 'Fleet Owner / Transport',
  registeredAddress: '12 MG Road, Pune 411001',
  isRegistered: true,
};

export const INITIAL_VEHICLES: FleetVehicle[] = [
  {
    id: 'vehicle-1',
    vehicleTypeCode: 'MINI_TRUCK',
    vehicleTypeName: 'Mini truck',
    make: 'Tata',
    model: 'Tata Ace Gold',
    plateNumber: 'KA 03 MX 2814',
    capacityKg: 600,
    driver: {
      id: 'driver-1',
      name: 'Arun Kumar',
      phone: '+91 98765 43210',
      dob: '12 / 05 / 1990',
      dlNumber: 'KA0320180012345',
      rating: 4.9,
      isOwnerSelf: true,
      aadhaarUploaded: true,
      dlUploaded: true,
    },
    documents: {
      rc: { verified: true, label: 'Verified' },
      insurance: {
        verified: true,
        label: 'Expires in 28 days',
        expiryDays: 28,
        isExpiringSoon: true,
      },
      pollution: { verified: true, label: 'Verified' },
    },
  },
  {
    id: 'vehicle-2',
    vehicleTypeCode: 'MINI_TRUCK',
    vehicleTypeName: 'Mini truck',
    make: 'Tata',
    model: 'Tata Ace Gold',
    plateNumber: 'KA 03 MX 2814',
    capacityKg: 600,
    driver: {
      id: 'driver-2',
      name: 'Ketan',
      phone: '+91 98765 43214',
      dob: '24 / 08 / 1993',
      dlNumber: 'KA0320190054321',
      rating: 4.8,
      isOwnerSelf: false,
      aadhaarUploaded: true,
      dlUploaded: true,
    },
    documents: {
      rc: { verified: true, label: 'Verified' },
      insurance: { verified: true, label: 'Expires in 45 days', expiryDays: 45 },
      pollution: { verified: true, label: 'Verified' },
    },
  },
  {
    id: 'vehicle-3',
    vehicleTypeCode: 'MINI_TRUCK',
    vehicleTypeName: 'Mini truck',
    make: 'Tata',
    model: 'Tata Ace Gold',
    plateNumber: 'KA 03 MX 2814',
    capacityKg: 600,
    driver: {
      id: 'driver-3',
      name: 'Ramesh',
      phone: '+91 98765 43215',
      dob: '05 / 11 / 1988',
      dlNumber: 'KA0320150098765',
      rating: 4.7,
      isOwnerSelf: false,
      aadhaarUploaded: true,
      dlUploaded: true,
    },
    documents: {
      rc: { verified: true, label: 'Verified' },
      insurance: { verified: true, label: 'Expires in 60 days', expiryDays: 60 },
      pollution: { verified: true, label: 'Verified' },
    },
  },
];

interface FleetState {
  company: CompanyDetails;
  dashboardRole: DashboardRole;
  vehicles: FleetVehicle[];
  selectedVehicleId: string | null;
  activeDriverVehicleId: string | null;
  setDashboardRole: (role: DashboardRole) => void;
  setActiveDriverVehicleId: (id: string) => void;
  updateCompany: (details: Partial<CompanyDetails>) => void;
  addVehicle: (vehicle: Omit<FleetVehicle, 'id'>) => FleetVehicle;
  updateVehicle: (id: string, updates: Partial<FleetVehicle>) => void;
  removeVehicle: (id: string) => void;
  assignDriver: (vehicleId: string, driver: FleetDriver) => void;
  unassignDriver: (vehicleId: string) => void;
  setSelectedVehicleId: (id: string | null) => void;
  resetToDefaults: () => void;
}

interface PersistedFleetData {
  company: CompanyDetails;
  dashboardRole: DashboardRole;
  vehicles: FleetVehicle[];
}

function loadPersistedData(): PersistedFleetData {
  const raw = kvStorage.getString(STORAGE_KEYS.FLEET_DATA);
  if (!raw) {
    return {
      company: DEFAULT_COMPANY,
      dashboardRole: 'driver',
      vehicles: INITIAL_VEHICLES,
    };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      company: parsed.company ?? DEFAULT_COMPANY,
      dashboardRole: parsed.dashboardRole ?? 'driver',
      vehicles: parsed.vehicles?.length ? parsed.vehicles : INITIAL_VEHICLES,
    };
  } catch {
    return {
      company: DEFAULT_COMPANY,
      dashboardRole: 'driver',
      vehicles: INITIAL_VEHICLES,
    };
  }
}

function persistData(data: PersistedFleetData): void {
  try {
    kvStorage.setString(STORAGE_KEYS.FLEET_DATA, JSON.stringify(data));
  } catch {}
}

const initial = loadPersistedData();

const _useFleetStore = create<FleetState>((set, get) => ({
  company: initial.company,
  dashboardRole: initial.dashboardRole,
  vehicles: initial.vehicles,
  selectedVehicleId: initial.vehicles[0]?.id ?? null,
  activeDriverVehicleId: initial.vehicles[0]?.id ?? null,

  setDashboardRole: (role: DashboardRole) => {
    set({ dashboardRole: role });
    persistData({
      company: get().company,
      dashboardRole: role,
      vehicles: get().vehicles,
    });
  },

  setActiveDriverVehicleId: (id: string) => {
    set({ activeDriverVehicleId: id });
  },

  updateCompany: (details: Partial<CompanyDetails>) => {
    const updatedCompany = { ...get().company, ...details, isRegistered: true };
    set({ company: updatedCompany });
    persistData({
      company: updatedCompany,
      dashboardRole: get().dashboardRole,
      vehicles: get().vehicles,
    });
  },

  addVehicle: (data: Omit<FleetVehicle, 'id'>) => {
    const newVehicle: FleetVehicle = {
      ...data,
      id: `vehicle-${Date.now()}`,
    };
    const nextVehicles = [newVehicle, ...get().vehicles];
    set({ vehicles: nextVehicles, selectedVehicleId: newVehicle.id });
    persistData({
      company: get().company,
      dashboardRole: get().dashboardRole,
      vehicles: nextVehicles,
    });
    return newVehicle;
  },

  updateVehicle: (id: string, updates: Partial<FleetVehicle>) => {
    const nextVehicles = get().vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v));
    set({ vehicles: nextVehicles });
    persistData({
      company: get().company,
      dashboardRole: get().dashboardRole,
      vehicles: nextVehicles,
    });
  },

  removeVehicle: (id: string) => {
    const nextVehicles = get().vehicles.filter((v) => v.id !== id);
    const nextSelected = nextVehicles[0]?.id ?? null;
    const nextActive =
      get().activeDriverVehicleId === id ? nextSelected : get().activeDriverVehicleId;
    set({
      vehicles: nextVehicles,
      selectedVehicleId: nextSelected,
      activeDriverVehicleId: nextActive,
    });
    persistData({
      company: get().company,
      dashboardRole: get().dashboardRole,
      vehicles: nextVehicles,
    });
  },

  assignDriver: (vehicleId: string, driver: FleetDriver) => {
    const nextVehicles = get().vehicles.map((v) => (v.id === vehicleId ? { ...v, driver } : v));
    set({ vehicles: nextVehicles });
    persistData({
      company: get().company,
      dashboardRole: get().dashboardRole,
      vehicles: nextVehicles,
    });
  },

  unassignDriver: (vehicleId: string) => {
    const defaultUnassigned: FleetDriver = {
      id: '',
      name: 'Unassigned',
      phone: '',
      rating: undefined,
      isOwnerSelf: false,
    };
    const nextVehicles = get().vehicles.map((v) =>
      v.id === vehicleId ? { ...v, driver: defaultUnassigned } : v,
    );
    set({ vehicles: nextVehicles });
    persistData({
      company: get().company,
      dashboardRole: get().dashboardRole,
      vehicles: nextVehicles,
    });
  },

  setSelectedVehicleId: (id: string | null) => set({ selectedVehicleId: id }),

  resetToDefaults: () => {
    set({
      company: DEFAULT_COMPANY,
      dashboardRole: 'driver',
      vehicles: INITIAL_VEHICLES,
      selectedVehicleId: INITIAL_VEHICLES[0]?.id ?? null,
    });
    persistData({
      company: DEFAULT_COMPANY,
      dashboardRole: 'driver',
      vehicles: INITIAL_VEHICLES,
    });
  },
}));

export const useFleetStore = createSelectors(_useFleetStore);
