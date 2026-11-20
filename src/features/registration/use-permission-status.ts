import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';

export type PermissionId = 'location' | 'background' | 'camera' | 'notifications';

/** Needed to use the app at all (signed in): the gate blocks until these are allowed. */
export const REQUIRED_PERMISSIONS: PermissionId[] = ['location', 'camera', 'notifications'];

export interface PermissionInfo {
  granted: boolean;
  canAskAgain: boolean;
}

/** Null when the permission does not apply on this phone (e.g. background location on Android). */
export type PermissionMap = Record<PermissionId, PermissionInfo | null>;

// Android only tells us "never ask again" from a request, so remember it for this run.
let notificationsBlocked = false;

/** Android 13+ asks for notification access (trip alerts, the online notification). */
const notificationsApply = Platform.OS === 'android' && Number(Platform.Version) >= 33;

async function readNotifications(): Promise<PermissionInfo> {
  if (!notificationsApply) throw new Error('Not asked on this phone');
  const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  return { granted, canAskAgain: granted || !notificationsBlocked };
}

/** Shows the system prompt for one permission. */
export async function requestPermission(id: PermissionId): Promise<void> {
  if (id === 'location') await Location.requestForegroundPermissionsAsync();
  if (id === 'background') {
    // Android and iOS only offer "always" once "while using" is granted.
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.granted) await Location.requestBackgroundPermissionsAsync();
  }
  if (id === 'camera') await ImagePicker.requestCameraPermissionsAsync();
  if (id === 'notifications' && notificationsApply) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    notificationsBlocked = result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
  }
}

/** True when every required permission that applies on this phone is allowed. */
export function requiredGranted(permissions: PermissionMap | null): boolean {
  return (
    permissions !== null && REQUIRED_PERMISSIONS.every((id) => permissions[id]?.granted !== false)
  );
}

const READERS: Record<PermissionId, () => Promise<PermissionInfo>> = {
  location: Location.getForegroundPermissionsAsync,
  // Throws on Android builds that don't declare ACCESS_BACKGROUND_LOCATION (this app tracks
  // through a foreground service while online instead), so that row is hidden there.
  background: Location.getBackgroundPermissionsAsync,
  camera: ImagePicker.getCameraPermissionsAsync,
  notifications: readNotifications,
};

/** Reads each permission on its own, so one unsupported permission can't hide the others. */
export async function readPermissions(): Promise<PermissionMap> {
  const ids = Object.keys(READERS) as PermissionId[];
  const results = await Promise.allSettled(ids.map((id) => READERS[id]()));
  return Object.fromEntries(
    ids.map((id, i) => {
      const r = results[i];
      return [
        id,
        r.status === 'fulfilled'
          ? { granted: r.value.granted, canAskAgain: r.value.canAskAgain }
          : null,
      ];
    }),
  ) as PermissionMap;
}

/** Current permissions, re-read whenever the screen comes into focus (e.g. back from Settings). */
export function usePermissionStatus() {
  const [permissions, setPermissions] = useState<PermissionMap | null>(null);

  const refresh = useCallback(async () => {
    setPermissions(await readPermissions());
  }, []);

  // On focus, and again whenever the app comes back (e.g. from Settings) while this screen is open.
  useFocusEffect(
    useCallback(() => {
      const read = () =>
        readPermissions()
          .then(setPermissions)
          .catch(() => {});
      read();
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') read();
      });
      return () => sub.remove();
    }, []),
  );

  // Counted over the required ones; background location is a bonus, not needed.
  const applicable = permissions
    ? REQUIRED_PERMISSIONS.map((id) => permissions[id]).filter(
        (p): p is PermissionInfo => p !== null,
      )
    : [];
  const allGranted = requiredGranted(permissions);
  const grantedCount = applicable.filter((p) => p.granted).length;

  return { permissions, refresh, allGranted, grantedCount, total: applicable.length };
}
