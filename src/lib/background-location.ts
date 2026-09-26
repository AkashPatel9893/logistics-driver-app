/**
 * Driver GPS while online, including when the app is in the background or
 * another app (Google Maps) is in front. Android runs it as a foreground
 * service with a persistent notification; iOS uses the location background
 * mode (blue status-bar pill). Fixes update the location store and are
 * reported to the backend at most every 15 s.
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { useAuthStore } from '@/features/auth/use-auth-store';
import { IS_MOCK_API } from '@/lib/api/config';
import { driverApi } from '@/lib/api/driver';
import { refreshBubble } from '@/lib/driver-bubble';
import { tick as runMockBackend } from '@/mocks/driver/scheduler';
import { useLocationStore } from '@/stores/location-store';

export const DRIVER_LOCATION_TASK = 'ryno-driver-location';

/** Minimum gap between location uploads; the socket fan-out to customers uses the latest. */
const REPORT_INTERVAL_MS = 15_000;
let lastReportAt = 0;

/** Stores a fix for the UI and reports it to the backend (throttled). */
export function handleLocationFix(position: Location.LocationObject, forceReport = false): void {
  const { latitude, longitude, heading, speed } = position.coords;
  const speedKmph = speed !== null && speed >= 0 ? Math.round(speed * 3.6) : null;
  useLocationStore
    .getState()
    .setCurrent({ latitude, longitude, heading: heading ?? null, speedKmph });

  const now = Date.now();
  if (!forceReport && now - lastReportAt < REPORT_INTERVAL_MS) return;
  lastReportAt = now;
  driverApi
    .reportLocation({
      latitude,
      longitude,
      heading: heading ?? null,
      speedKmph,
      recordedAt: new Date(position.timestamp).toISOString(),
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
    // Android pauses JS timers in the background, which would freeze the
    // in-app mock backend (offers, chat, payments). A real backend pushes over
    // the socket instead, so this only matters without one.
    const userId = useAuthStore.getState().user?.id;
    if (IS_MOCK_API && userId) runMockBackend(userId);
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
