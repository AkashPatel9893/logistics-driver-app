import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Platform } from 'react-native';

import { AppPressable, AppText, AppView, Icon } from '@/components/ui';
import { useAuthStore } from '@/features/auth/use-auth-store';
import {
  readPermissions,
  requestPermission,
  REQUIRED_PERMISSIONS,
  type PermissionId,
  type PermissionMap,
} from '@/features/registration/use-permission-status';

const LABELS: Record<PermissionId, string> = {
  location: 'Location',
  background: 'Background location',
  camera: 'Camera',
  notifications: 'Notifications',
};

/**
 * Permissions are mandatory for a driver app. Location is asked as soon as the app opens (it finds
 * the city before login); once signed in, camera and notifications are required too, whether the
 * driver is still registering or already approved. While any is missing, a blocking dialog covers
 * the app. "Allow" asks for the next missing one, or opens the app's settings once Android/iOS no
 * longer shows the system prompt (denied twice / "Don't ask again"). Re-checks whenever the app
 * comes back to the foreground (e.g. returning from Settings).
 */
export function LocationPermissionGate() {
  const isSignedIn = useAuthStore((state) => state.status === 'signIn');
  const [permissions, setPermissions] = useState<PermissionMap | null>(null);
  const busy = useRef(false);

  const required: PermissionId[] = isSignedIn ? REQUIRED_PERMISSIONS : ['location'];
  // null = doesn't apply on this phone (e.g. notifications before Android 13).
  const missing = permissions
    ? required.filter((id) => permissions[id] !== null && permissions[id]?.granted !== true)
    : [];
  const next = missing[0];
  const canAskNext = next ? permissions?.[next]?.canAskAgain !== false : true;

  const check = useCallback(async (ask: PermissionId | null) => {
    if (busy.current) return;
    busy.current = true;
    try {
      let current = await readPermissions();
      if (ask && current[ask] && !current[ask]?.granted && current[ask]?.canAskAgain) {
        await requestPermission(ask);
        current = await readPermissions();
      }
      setPermissions(current);
    } catch {
      // Keep the last known state.
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    // First launch: show the location prompt straight away (state is set after the async read).
    void Promise.resolve().then(() => check('location'));
    const sub = AppState.addEventListener('change', (state) => {
      // Back from Settings or another app: only re-read, don't prompt again.
      if (state === 'active') check(null);
    });
    return () => sub.remove();
  }, [check]);

  // Signing in adds camera and notifications: re-read so the dialog shows if they are missing.
  useEffect(() => {
    if (isSignedIn) void Promise.resolve().then(() => check(null));
  }, [isSignedIn, check]);

  const handleAllow = () => {
    if (!next) return;
    if (canAskNext) check(next);
    else Linking.openSettings();
  };

  return (
    <Modal
      visible={missing.length > 0}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <AppView className="flex-1 items-center justify-center bg-black/60 px-8">
        <AppView className="w-full gap-4 rounded-3xl bg-surface p-6">
          <AppView className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft">
            <Icon name="location" size={24} tone="brand" />
          </AppView>
          <AppView className="gap-1.5">
            <AppText className="text-[20px] font-extrabold text-foreground">
              Mandatory permissions required
            </AppText>
            <AppText className="text-[14px] leading-5 text-muted">
              {canAskNext
                ? 'RYNO Partner needs these permissions to find your city, take document photos and send you delivery requests.'
                : `Please allow ${next ? LABELS[next] : 'these permissions'} from App settings to continue.`}
            </AppText>
          </AppView>
          <AppView className="gap-2.5">
            {required
              .filter((id) => permissions?.[id] !== null)
              .map((id) => {
                const granted = permissions?.[id]?.granted === true;
                return (
                  <AppView key={id} row className="items-center gap-2.5">
                    {granted ? (
                      <Icon name="checkmark.circle.fill" size={18} tone="success" />
                    ) : (
                      <AppView className="mx-[5px] h-2 w-2 rounded-full bg-foreground" />
                    )}
                    <AppText
                      className={`text-[15px] font-bold ${granted ? 'text-muted' : 'text-foreground'}`}
                    >
                      {LABELS[id]}
                    </AppText>
                  </AppView>
                );
              })}
          </AppView>
          <AppPressable
            onPress={handleAllow}
            pressScale={0.97}
            accessibilityRole="button"
            className="mt-1 items-center rounded-2xl bg-brand py-3.5"
          >
            <AppText className="text-[15px] font-extrabold text-brand-foreground">
              {canAskNext ? `Allow ${next ? LABELS[next].toLowerCase() : ''}` : 'Open settings'}
            </AppText>
          </AppPressable>
        </AppView>
      </AppView>
    </Modal>
  );
}
