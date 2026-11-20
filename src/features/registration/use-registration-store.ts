import { create } from 'zustand';

import { createSelectors } from '@/lib/create-selectors';
import { kvStorage } from '@/lib/storage';

import { clearDrafts } from './drafts';

const VEHICLE_TYPE_KEY = 'registration_vehicle_type_id';
const INTRO_KEY = 'registration_intro_pending';
const FLEET_DRIVER_KEY = 'registration_fleet_driver';

interface RegistrationState {
  /** Vehicle type picked before the vehicle is registered; prefills the vehicle form. */
  vehicleTypeId: string | null;
  /** Set once the driver profile is saved, so Home opens the registration steps once. */
  introPending: boolean;
  /** Drives a fleet owner's vehicle: the owner assigns it, so no vehicle type is picked. */
  fleetDriver: boolean;
  /** Forget everything (log out). */
  reset: () => void;
  setVehicleTypeId: (id: string) => void;
  setFleetDriver: (fleetDriver: boolean) => void;
  setIntroPending: (pending: boolean) => void;
}

const _useRegistrationStore = create<RegistrationState>((set) => ({
  vehicleTypeId: kvStorage.getString(VEHICLE_TYPE_KEY),
  introPending: kvStorage.getBoolean(INTRO_KEY) === true,
  fleetDriver: kvStorage.getBoolean(FLEET_DRIVER_KEY) === true,

  reset: () => {
    // Half-filled steps belong to the account that is logging out.
    clearDrafts('');
    for (const key of [
      VEHICLE_TYPE_KEY,
      INTRO_KEY,
      FLEET_DRIVER_KEY,
      'registration_awaiting_approval',
    ]) {
      kvStorage.delete(key);
    }
    set({ vehicleTypeId: null, introPending: false, fleetDriver: false });
  },

  setVehicleTypeId: (id) => {
    kvStorage.setString(VEHICLE_TYPE_KEY, id);
    kvStorage.setBoolean(FLEET_DRIVER_KEY, false);
    set({ vehicleTypeId: id, fleetDriver: false });
  },

  setFleetDriver: (fleetDriver) => {
    kvStorage.setBoolean(FLEET_DRIVER_KEY, fleetDriver);
    if (fleetDriver) kvStorage.delete(VEHICLE_TYPE_KEY);
    set(fleetDriver ? { fleetDriver, vehicleTypeId: null } : { fleetDriver });
  },

  setIntroPending: (pending) => {
    kvStorage.setBoolean(INTRO_KEY, pending);
    set({ introPending: pending });
  },
}));

export const useRegistrationStore = createSelectors(_useRegistrationStore);
