import { create } from 'zustand';

import { createSelectors } from '@/lib/create-selectors';
import { kvStorage } from '@/lib/storage';

import { clearDrafts } from './drafts';

const VEHICLE_TYPE_KEY = 'registration_vehicle_type_id';
const INTRO_KEY = 'registration_intro_pending';
const FLEET_DRIVER_KEY = 'registration_fleet_driver';
const FLEET_INVITE_KEY = 'registration_fleet_invite';
const LINK_REQUEST_KEY = 'fleet_link_request_sent';

interface RegistrationState {
  /** Vehicle type picked before the vehicle is registered; prefills the vehicle form. */
  vehicleTypeId: string | null;
  /** Set once the driver profile is saved, so Home opens the registration steps once. */
  introPending: boolean;
  /** Drives a fleet owner's vehicle: the owner assigns it, so no vehicle type is picked. */
  fleetDriver: boolean;
  /** Company of the fleet owner who invited this number; null for a self sign-up. */
  fleetInviteCompany: string | null;
  /**
   * A join request this phone sent (masked owner number, ISO time). The backend has no driver-side
   * list of requests yet (backend item O14), so the app remembers it to show it is pending.
   */
  fleetLinkRequest: { to: string; sentAt: string } | null;
  setFleetLinkRequest: (request: { to: string; sentAt: string } | null) => void;
  /** Forget everything (log out). */
  reset: () => void;
  setVehicleTypeId: (id: string) => void;
  setFleetDriver: (fleetDriver: boolean) => void;
  /** An invited driver: remembers the fleet and skips choosing a vehicle type. */
  setFleetInvite: (companyName: string) => void;
  setIntroPending: (pending: boolean) => void;
}

function readLinkRequest(): { to: string; sentAt: string } | null {
  try {
    const raw = kvStorage.getString(LINK_REQUEST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const _useRegistrationStore = create<RegistrationState>((set) => ({
  vehicleTypeId: kvStorage.getString(VEHICLE_TYPE_KEY),
  introPending: kvStorage.getBoolean(INTRO_KEY) === true,
  fleetDriver: kvStorage.getBoolean(FLEET_DRIVER_KEY) === true,
  fleetInviteCompany: kvStorage.getString(FLEET_INVITE_KEY) ?? null,
  fleetLinkRequest: readLinkRequest(),

  reset: () => {
    // Half-filled steps belong to the account that is logging out.
    clearDrafts('');
    for (const key of [
      VEHICLE_TYPE_KEY,
      INTRO_KEY,
      FLEET_DRIVER_KEY,
      FLEET_INVITE_KEY,
      LINK_REQUEST_KEY,
      'registration_awaiting_approval',
    ]) {
      kvStorage.delete(key);
    }
    set({
      vehicleTypeId: null,
      introPending: false,
      fleetDriver: false,
      fleetInviteCompany: null,
      fleetLinkRequest: null,
    });
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

  setFleetInvite: (companyName) => {
    kvStorage.setString(FLEET_INVITE_KEY, companyName);
    kvStorage.setBoolean(FLEET_DRIVER_KEY, true);
    kvStorage.delete(VEHICLE_TYPE_KEY);
    set({ fleetInviteCompany: companyName, fleetDriver: true, vehicleTypeId: null });
  },

  setFleetLinkRequest: (request) => {
    if (request) kvStorage.setString(LINK_REQUEST_KEY, JSON.stringify(request));
    else kvStorage.delete(LINK_REQUEST_KEY);
    set({ fleetLinkRequest: request });
  },

  setIntroPending: (pending) => {
    kvStorage.setBoolean(INTRO_KEY, pending);
    set({ introPending: pending });
  },
}));

export const useRegistrationStore = createSelectors(_useRegistrationStore);
