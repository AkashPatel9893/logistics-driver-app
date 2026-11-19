import { create } from 'zustand';

import { createSelectors } from '@/lib/create-selectors';
import { getItem, removeItem, setItem } from '@/lib/storage';

const CITY_KEY = 'registration_city';

export interface SelectedCity {
  /** What the driver sees, e.g. "Bengaluru". */
  name: string;
  /** Backend operating market; sent as market_code when the profile is created. */
  marketCode: string;
}

interface CityState {
  city: SelectedCity | null;
  setCity: (city: SelectedCity) => void;
  clear: () => void;
}

const _useCityStore = create<CityState>((set) => ({
  city: getItem<SelectedCity>(CITY_KEY),
  setCity: (city) => {
    setItem(CITY_KEY, city);
    set({ city });
  },
  clear: () => {
    removeItem(CITY_KEY);
    set({ city: null });
  },
}));

export const useCityStore = createSelectors(_useCityStore);
