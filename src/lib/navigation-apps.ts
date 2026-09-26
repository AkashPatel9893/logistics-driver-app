import { ActionSheetIOS, Alert, Linking, Platform } from 'react-native';

import type { GeoPoint } from '@/lib/api/models';

/**
 * Turn-by-turn is handed to the map apps drivers already use. These build the
 * driving-directions deep link for each app and let the driver pick one.
 */

interface NavigationApp {
  name: string;
  /** Deep link that starts driving directions to the destination. */
  url: string;
  /** Opened when `url` can't be (app not installed). */
  fallbackUrl?: string;
  /** Only offered when `url` can be opened (iOS: scheme is in LSApplicationQueriesSchemes). */
  requiresInstall?: boolean;
}

function coords({ latitude, longitude }: GeoPoint): string {
  return `${latitude},${longitude}`;
}

function googleMapsWebUrl(target: GeoPoint): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${coords(target)}&travelmode=driving`;
}

function iosApps(target: GeoPoint): NavigationApp[] {
  const destination = coords(target);
  return [
    {
      // Always offered: most drivers use it; without the app it opens on the web.
      name: 'Google Maps',
      url: `comgooglemaps://?daddr=${destination}&directionsmode=driving`,
      fallbackUrl: googleMapsWebUrl(target),
    },
    { name: 'Apple Maps', url: `maps://?daddr=${destination}&dirflg=d` },
    {
      name: 'Waze',
      url: `waze://?ll=${destination}&navigate=yes`,
      requiresInstall: true,
    },
  ];
}

function androidApps(target: GeoPoint, label: string): NavigationApp[] {
  const destination = coords(target);
  return [
    {
      // Starts Google Maps straight in driving navigation.
      name: 'Google Maps',
      url: `google.navigation:q=${destination}&mode=d`,
      fallbackUrl: googleMapsWebUrl(target),
    },
    {
      // The system chooser lists every installed map app (Waze, MapmyIndia, …).
      name: 'Other map apps',
      url: `geo:${destination}?q=${destination}(${encodeURIComponent(label)})`,
      fallbackUrl: googleMapsWebUrl(target),
    },
  ];
}

async function launch(app: NavigationApp): Promise<void> {
  try {
    // iOS can answer this for schemes in LSApplicationQueriesSchemes. Android 11+
    // hides other apps from canOpenURL, so there we just try and fall back on error.
    const missingOnIos =
      Platform.OS === 'ios' &&
      app.fallbackUrl !== undefined &&
      !(await Linking.canOpenURL(app.url).catch(() => false));
    if (missingOnIos) {
      throw new Error('not installed');
    }
    await Linking.openURL(app.url);
  } catch {
    if (app.fallbackUrl) {
      await Linking.openURL(app.fallbackUrl).catch(() => undefined);
    } else {
      Alert.alert('Could not open', `${app.name} is not available on this phone.`);
    }
  }
}

async function availableApps(target: GeoPoint, label: string): Promise<NavigationApp[]> {
  const apps = Platform.OS === 'ios' ? iosApps(target) : androidApps(target, label);
  const checks = await Promise.all(
    apps.map((app) =>
      app.requiresInstall ? Linking.canOpenURL(app.url).catch(() => false) : true,
    ),
  );
  return apps.filter((_, i) => checks[i]);
}

/** Lets the driver choose a map app and starts driving directions to `target`. */
export async function openNavigationChooser(target: GeoPoint, label: string): Promise<void> {
  const apps = await availableApps(target, label);
  if (apps.length === 0) {
    await Linking.openURL(googleMapsWebUrl(target));
    return;
  }

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Navigate with',
        message: label,
        options: [...apps.map((app) => app.name), 'Cancel'],
        cancelButtonIndex: apps.length,
      },
      (index) => {
        const app = apps[index];
        if (app) launch(app);
      },
    );
    return;
  }

  Alert.alert('Navigate with', label, [
    ...apps.map((app) => ({ text: app.name, onPress: () => launch(app) })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}
