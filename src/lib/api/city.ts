import * as Location from 'expo-location';

import { kvStorage } from '@/lib/storage';

import { request } from './client';

/** Rejects after `ms`: location and geocoder calls can wait forever without a GPS fix. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timed out')), ms)),
  ]);
}

export interface CityMatch {
  name: string;
  /** Null when Ryno does not operate there yet. */
  marketCode: string | null;
}

export interface CitySuggestion {
  id: string;
  name: string;
  address: string;
}

/** Operating market for a point, from the backend's service zones. */
async function marketAt(latitude: number, longitude: number): Promise<string | null> {
  const res = await request<{ serviceable: boolean; market_code: string | null }>({
    url: '/serviceability',
    params: { lat: latitude, lng: longitude },
  });
  return res.serviceable ? res.market_code : null;
}

/** "MG Road, Bengaluru, Karnataka 560001, India" → "Bengaluru" (the part before "State PIN"). */
function cityFromAddress(address: string): string | null {
  const parts = address.split(',').map((p) => p.trim());
  const statePin = parts.findIndex((p) => /\b\d{6}\b/.test(p));
  if (statePin > 0) return parts[statePin - 1];
  return parts.length >= 3 ? parts[parts.length - 3] : null;
}

/** City name for a point: the phone's own geocoder first (free), then the backend maps API. */
async function cityNameAt(latitude: number, longitude: number): Promise<string | null> {
  try {
    const [place] = await withTimeout(Location.reverseGeocodeAsync({ latitude, longitude }), 8_000);
    const name = place?.city ?? place?.subregion ?? place?.district;
    if (name) return name;
  } catch {}
  const place = await request<{ name: string; address: string } | null>({
    url: '/places/reverse',
    params: { lat: latitude, lng: longitude },
  }).catch(() => null);
  return place ? (cityFromAddress(place.address) ?? place.name) : null;
}

const DETECTED_KEY = 'detected_city';
const DETECTED_TTL_MS = 7 * 24 * 60 * 60_000;

// One Google billing session per city search, closed by the details call.
let sessionToken = newToken();
function newToken() {
  return `city${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export const cityApi = {
  /** Last detected city saved on this device, or null when none or older than a week. */
  cached: (): CityMatch | null => {
    try {
      const raw = kvStorage.getString(DETECTED_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw) as CityMatch & { at: number };
      if (Date.now() - saved.at > DETECTED_TTL_MS) return null;
      return { name: saved.name, marketCode: saved.marketCode };
    } catch {
      return null;
    }
  },

  /** The city the phone is in, saved on the device so reopening the screen costs no API calls. */
  detect: async (): Promise<CityMatch> => {
    const cached = cityApi.cached();
    if (cached) return cached;
    // The phone's saved location answers instantly; only the city is needed, and that rarely
    // changes. Wait for a live GPS reading (10 s max) only when the phone has none at all.
    const position =
      (await Location.getLastKnownPositionAsync().catch(() => null)) ??
      (await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        10_000,
      ).catch(() => null));
    if (!position) throw new Error('no location found');
    const { latitude, longitude } = position.coords;
    const [name, marketCode] = await Promise.all([
      cityNameAt(latitude, longitude),
      marketAt(latitude, longitude),
    ]);
    const match = { name: name ?? 'Your location', marketCode };
    if (name) kvStorage.setString(DETECTED_KEY, JSON.stringify({ ...match, at: Date.now() }));
    return match;
  },

  search: async (q: string, signal?: AbortSignal): Promise<CitySuggestion[]> => {
    const res = await request<CitySuggestion[]>({
      url: '/places/autocomplete',
      params: { q, session_token: sessionToken, limit: 8 },
      signal,
    });
    return res ?? [];
  },

  /** Resolves a picked suggestion to its operating market. */
  resolve: async (suggestion: CitySuggestion): Promise<CityMatch> => {
    const place = await request<{ latitude: number; longitude: number }>({
      url: `/places/${encodeURIComponent(suggestion.id)}`,
      params: { session_token: sessionToken },
    });
    sessionToken = newToken();
    return { name: suggestion.name, marketCode: await marketAt(place.latitude, place.longitude) };
  },
};
