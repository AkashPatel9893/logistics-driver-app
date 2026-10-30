import { Location } from 'expo-location/next';
import { useEffect } from 'react';

import {
  handleLocationFix,
  startBackgroundLocation,
  stopBackgroundLocation,
} from '@/lib/background-location';
import { driverApi } from '@/lib/api/driver';
import { useLocationStore } from '@/stores/location-store';

/** A cached fix older than this is not trusted as the starting position (in seconds). */
const MAX_LAST_KNOWN_AGE_SEC = 120;
/**
 * The backend drops a driver from dispatch when their position is older than
 * 60 s, and GPS sends nothing while parked — so re-send the last fix this often.
 */
const HEARTBEAT_MS = 20_000;
/** Don't let a slow first fix hold up the continuous updates (in seconds). */
const FIRST_FIX_TIMEOUT_SEC = 10;

/**
 * While the driver is online, keeps GPS running — in the foreground and in
 * the background (see lib/background-location) — and stops it when offline.
 * Uses next-gen expo-location/next APIs.
 */
export function useLocationReporter(isOnline: boolean) {
  useEffect(() => {
    if (!isOnline) {
      stopBackgroundLocation().catch(() => undefined);
      return;
    }
    let cancelled = false;

    (async () => {
      const perm = await Location.requestForegroundPermissions().catch(() => null);
      if (cancelled) return;
      const status = perm?.status === 'granted' ? 'granted' : 'denied';
      useLocationStore.getState().setPermission(status);
      if (status !== 'granted') return;

      // Updates only arrive when the position changes, so a driver standing
      // still would never get a first fix. Seed it explicitly via getPosition().
      const position = await Location.getPosition({
        maxCachedAge: MAX_LAST_KNOWN_AGE_SEC,
        timeout: FIRST_FIX_TIMEOUT_SEC,
      }).catch(() => null);

      if (position && !cancelled) {
        handleLocationFix(position, true);
      }
      if (cancelled) return;

      await startBackgroundLocation().catch((error: unknown) => {
        // e.g. Android refuses to start a foreground service from the background.
        console.warn('[location] background updates not started', error);
      });
    })();

    const heartbeat = setInterval(() => {
      const fix = useLocationStore.getState().current;
      if (!fix) return;
      driverApi
        .reportLocation({
          latitude: fix.latitude,
          longitude: fix.longitude,
          heading: fix.heading,
          speedKmph: fix.speedKmph,
          recordedAt: new Date().toISOString(),
        })
        .catch(() => {
          // The next beat retries.
        });
    }, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      clearInterval(heartbeat);
    };
  }, [isOnline]);
}
