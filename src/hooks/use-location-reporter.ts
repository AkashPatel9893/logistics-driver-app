import * as Location from 'expo-location';
import { useEffect } from 'react';

import {
  handleLocationFix,
  startBackgroundLocation,
  stopBackgroundLocation,
} from '@/lib/background-location';
import { useLocationStore } from '@/stores/location-store';

/** A cached fix older than this is not trusted as the starting position. */
const MAX_LAST_KNOWN_AGE_MS = 2 * 60_000;
/** Don't let a slow first fix hold up the continuous updates. */
const FIRST_FIX_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise.catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * While the driver is online, keeps GPS running — in the foreground and in
 * the background (see lib/background-location) — and stops it when offline.
 */
export function useLocationReporter(isOnline: boolean) {
  useEffect(() => {
    if (!isOnline) {
      stopBackgroundLocation().catch(() => undefined);
      return;
    }
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      useLocationStore.getState().setPermission(status === 'granted' ? 'granted' : 'denied');
      if (status !== 'granted') return;

      // Updates only arrive when the position changes, so a driver standing
      // still would never get a first fix. Seed it explicitly.
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: MAX_LAST_KNOWN_AGE_MS,
      }).catch(() => null);
      if (lastKnown) handleLocationFix(lastKnown, true);
      else {
        void withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
          FIRST_FIX_TIMEOUT_MS,
        ).then((fix) => fix && handleLocationFix(fix, true));
      }
      if (cancelled) return;

      await startBackgroundLocation().catch((error: unknown) => {
        // e.g. Android refuses to start a foreground service from the background.
        console.warn('[location] background updates not started', error);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [isOnline]);
}
