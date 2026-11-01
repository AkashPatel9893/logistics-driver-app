/**
 * Driver GPS while online, including when the app is in the background or
 * another app (Google Maps) is in front. Android runs it as a foreground
 * service with a persistent notification; iOS uses the location background
 * mode (blue status-bar pill). Fixes update the location store and are
 * reported to the backend at most every 15 s.
 */
import * as Location from 'expo-location';
import { AppState } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import type { Position } from 'expo-location/next';

import { driverApi } from '@/lib/api/driver';
import { jobsApi } from '@/lib/api/jobs';
import { refreshBubble, setBubbleOffers } from '@/lib/driver-bubble';
import { useLocationStore } from '@/stores/location-store';

export const DRIVER_LOCATION_TASK = 'ryno-driver-location';

/**
 * Minimum gap between location uploads. During a trip the customer watches the car move, so
 * uploads are frequent (a little under the 5 s GPS cadence so no fix is skipped); the rest of
 * the time a slow rate is enough to stay online for dispatch (backend drops drivers after 60 s).
 */
const TRIP_REPORT_INTERVAL_MS = 4_000;
const IDLE_REPORT_INTERVAL_MS = 45_000;
let lastReportAt = 0;

export type LocationFixInput =
  | Location.LocationObject
  | Position
  | {
      latitude: number;
      longitude: number;
      heading?: number | null;
      speed?: number | null;
      timestamp?: number;
    };

/** Stores a fix for the UI and reports it to the backend (throttled). */
export function handleLocationFix(position: LocationFixInput, forceReport = false): void {
  let latitude: number;
  let longitude: number;
  let heading: number | null = null;
  let speed: number | null = null;
  let timestamp = Date.now();

  if ('coordinates' in position) {
    latitude = position.coordinates.latitude;
    longitude = position.coordinates.longitude;
    heading = (position as any).heading ?? null;
    speed = (position as any).speed ?? null;
    timestamp = position.timestamp;
  } else if ('coords' in position) {
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
    heading = position.coords.heading ?? null;
    speed = position.coords.speed ?? null;
    timestamp = position.timestamp;
  } else {
    latitude = position.latitude;
    longitude = position.longitude;
    heading = position.heading ?? null;
    speed = position.speed ?? null;
    if (position.timestamp) timestamp = position.timestamp;
  }

  const speedKmph = speed !== null && speed >= 0 ? Math.round(speed * 3.6) : null;
  useLocationStore
    .getState()
    .setCurrent({ latitude, longitude, heading: heading ?? null, speedKmph });

  const now = Date.now();
  const reportIntervalMs = useLocationStore.getState().tripActive
    ? TRIP_REPORT_INTERVAL_MS
    : IDLE_REPORT_INTERVAL_MS;
  if (!forceReport && now - lastReportAt < reportIntervalMs) return;
  lastReportAt = now;
  driverApi
    .reportLocation({
      latitude,
      longitude,
      heading: heading ?? null,
      speedKmph,
      recordedAt: new Date(timestamp).toISOString(),
    })
    .catch(() => {
      // Next fix retries; a dropped update is harmless.
    });
}

// Must run at module load (imported from the root layout) so the OS can
// deliver fixes to it even when the app was started in the background.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  DRIVER_LOCATION_TASK,
  async ({ data, error }) => {
    if (error || !data) return;
    const latest = data.locations.at(-1);
    if (latest) handleLocationFix(latest);
    // The app's own polling pauses in the background, so this ~5 s tick feeds new requests to the
    // floating overlay (an offer lives only ~30 s). While a trip is active there are no offers.
    if (AppState.currentState !== 'active' && !useLocationStore.getState().tripActive) {
      await jobsApi
        .getOffers()
        .then(setBubbleOffers)
        .catch(() => {});
    }
    refreshBubble();
  },
);

export async function startBackgroundLocation(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK)) return;
  await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
    // GPS-level accuracy: "balanced" on Android is Wi-Fi/cell only.
    accuracy: Location.Accuracy.High,
    // Every ~5 s even when parked: dispatch needs a fresh position.
    timeInterval: 5_000,
    distanceInterval: 0,
    activityType: Location.ActivityType.AutomotiveNavigation,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "You're online",
      notificationBody: 'RYNO Partner is finding delivery requests near you',
      notificationColor: '#FF5A1F',
      killServiceOnDestroy: false,
    },
  });
}

export async function stopBackgroundLocation(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  }
}
