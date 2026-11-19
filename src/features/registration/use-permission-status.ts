import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export type PermissionId = 'location' | 'background' | 'camera';

export interface PermissionInfo {
  granted: boolean;
  canAskAgain: boolean;
}

/** Null when the permission does not apply on this phone (e.g. background location on Android). */
export type PermissionMap = Record<PermissionId, PermissionInfo | null>;

const READERS: Record<PermissionId, () => Promise<PermissionInfo>> = {
  location: Location.getForegroundPermissionsAsync,
  // Throws on Android builds that don't declare ACCESS_BACKGROUND_LOCATION (this app tracks
  // through a foreground service while online instead), so that row is hidden there.
  background: Location.getBackgroundPermissionsAsync,
  camera: ImagePicker.getCameraPermissionsAsync,
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

  useFocusEffect(
    useCallback(() => {
      readPermissions()
        .then(setPermissions)
        .catch(() => {});
    }, []),
  );

  const applicable = permissions
    ? Object.values(permissions).filter((p): p is PermissionInfo => p !== null)
    : [];
  const allGranted = applicable.length > 0 && applicable.every((p) => p.granted);
  const grantedCount = applicable.filter((p) => p.granted).length;

  return { permissions, refresh, allGranted, grantedCount, total: applicable.length };
}
