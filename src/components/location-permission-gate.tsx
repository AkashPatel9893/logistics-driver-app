import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Platform } from 'react-native';

import { AppPressable, AppText, AppView, Icon } from '@/components/ui';

type GateState = 'checking' | 'granted' | 'blocked';

/**
 * Location is mandatory for a driver app. Asks as soon as the app opens; while it is not
 * granted, a blocking dialog covers the app. "Allow" asks again, or opens the app's
 * settings once Android/iOS no longer shows the system prompt (denied twice / "Don't ask again").
 * Re-checks whenever the app comes back to the foreground (e.g. returning from Settings).
 */
export function LocationPermissionGate() {
  const [state, setState] = useState<GateState>('checking');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const busy = useRef(false);

  const check = useCallback(async (ask: boolean) => {
    if (busy.current) return;
    busy.current = true;
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted && ask && permission.canAskAgain) {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      setCanAskAgain(permission.canAskAgain);
      setState(permission.granted ? 'granted' : 'blocked');
    } catch {
      setState('blocked');
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    // First launch: show the system prompt straight away (state is set after the async read).
    void Promise.resolve().then(() => check(true));
    const sub = AppState.addEventListener('change', (next) => {
      // Back from Settings or another app: only re-read, don't prompt again.
      if (next === 'active') check(false);
    });
    return () => sub.remove();
  }, [check]);

  const handleAllow = () => {
    if (canAskAgain) check(true);
    else Linking.openSettings();
  };

  return (
    <Modal
      visible={state === 'blocked'}
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
              {canAskAgain
                ? 'RYNO Partner needs these permissions to find your city and send you delivery requests nearby.'
                : 'Please allow these permissions from App settings to continue.'}
            </AppText>
          </AppView>
          <AppView row className="gap-2.5">
            <AppView className="h-2 w-2 rounded-full bg-foreground" />
            <AppText className="text-[15px] font-bold text-foreground">Location</AppText>
          </AppView>
          <AppPressable
            onPress={handleAllow}
            pressScale={0.97}
            accessibilityRole="button"
            className="mt-1 items-center rounded-2xl bg-brand py-3.5"
          >
            <AppText className="text-[15px] font-extrabold text-brand-foreground">
              {canAskAgain ? 'Allow' : 'Open settings'}
            </AppText>
          </AppPressable>
        </AppView>
      </AppView>
    </Modal>
  );
}
