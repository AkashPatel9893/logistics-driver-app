import { create } from 'zustand';

import type { GeoPoint } from '@/lib/api/models';
import { createSelectors } from '@/lib/create-selectors';

type LocationPermission = 'unknown' | 'granted' | 'denied';

interface LocationState {
  current: (GeoPoint & { heading: number | null; speedKmph: number | null }) | null;
  permission: LocationPermission;
  /** A trip is in progress, so the customer is watching and uploads go out faster. */
  tripActive: boolean;
  setCurrent: (current: LocationState['current']) => void;
  setPermission: (permission: LocationPermission) => void;
  setTripActive: (tripActive: boolean) => void;
}

/** The device's latest GPS fix, shared by the map and navigation card. */
const _useLocationStore = create<LocationState>((set) => ({
  current: null,
  permission: 'unknown',
  tripActive: false,
  setCurrent: (current) => set({ current }),
  setPermission: (permission) => set({ permission }),
  setTripActive: (tripActive) => set({ tripActive }),
}));

export const useLocationStore = createSelectors(_useLocationStore);
