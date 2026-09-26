import * as Location from 'expo-location';
import { useEffect } from 'react';

import { driverApi } from '@/lib/api/driver';
import { useLocationStore } from '@/stores/location-store';

/** Minimum gap between location uploads; the socket fan-out to customers uses the latest. */
const REPORT_INTERVAL_MS = 15_000;
/** A cached fix older than this is not trusted as the starting position. */
const MAX_LAST_KNOWN_AGE_MS = 2 * 60_000;
/** Don't let a slow first fix hold up the continuous watch. */
const FIRST_FIX_TIMEOUT_MS = 10_000;
/**
 * GPS-level accuracy: on Android, "balanced" uses Wi-Fi/cell positioning,
 * which is too coarse for navigation and absent on emulators.
 */
const ACCURACY = Location.Accuracy.High;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise.catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * While the driver is online, watches GPS, keeps the location store fresh
 * and reports the position to the backend for dispatch and live tracking.
 */
export function useLocationReporter(isOnline: boolean) {
  useEffect(() => {
    if (!isOnline) return;
    let subscription: Location.LocationSubscription | null = null;
    let lastReportAt = 0;
    let cancelled = false;

    const handleFix = (position: Location.LocationObject, forceReport = false) => {
      if (cancelled) return;
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
    };

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      useLocationStore.getState().setPermission(status === 'granted' ? 'granted' : 'denied');
      if (status !== 'granted') return;

      // Android only calls the watcher when the position changes, so a driver
      // standing still would never get a first fix. Seed it explicitly.
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: MAX_LAST_KNOWN_AGE_MS,
      }).catch(() => null);
      if (lastKnown) handleFix(lastKnown, true);
      else {
        // Not awaited before watching: the watch starts even if this is slow.
        void withTimeout(
          Location.getCurrentPositionAsync({ accuracy: ACCURACY }),
          FIRST_FIX_TIMEOUT_MS,
        ).then((fix) => fix && handleFix(fix, true));
      }
      if (cancelled) return;

      subscription = await Location.watchPositionAsync(
        { accuracy: ACCURACY, timeInterval: 5_000, distanceInterval: 20 },
        (position) => handleFix(position),
      );
      if (cancelled) subscription.remove();
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [isOnline]);
}
