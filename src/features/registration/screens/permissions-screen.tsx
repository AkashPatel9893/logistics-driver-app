import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Linking } from 'react-native';

import {
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  Icon,
  type IconName,
} from '@/components/ui';
import { SetupScreenLayout } from '@/features/driver/components/setup-screen-layout';

import { usePermissionStatus, type PermissionId } from '../use-permission-status';

const ITEMS: { id: PermissionId; title: string; body: string; icon: IconName }[] = [
  {
    id: 'location',
    title: 'Location',
    body: 'Find delivery requests near you',
    icon: 'location',
  },
  {
    id: 'background',
    title: 'Background location',
    body: 'Keep getting requests and share live tracking while the app is in the background',
    icon: 'location.north.fill',
  },
  {
    id: 'camera',
    title: 'Camera',
    body: 'Take document, pickup and delivery photos',
    icon: 'camera',
  },
];

/** Optional step: lets the driver grant everything the app needs up front. */
export function PermissionsScreen() {
  const { permissions, refresh, allGranted } = usePermissionStatus();

  const request = async (id: PermissionId) => {
    const info = permissions?.[id];
    if (info?.granted) return;
    if (info && !info.canAskAgain) {
      await Linking.openSettings();
      return;
    }
    if (id === 'location') await Location.requestForegroundPermissionsAsync();
    if (id === 'background') {
      // Android and iOS only offer "always" once "while using" is granted.
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.granted) await Location.requestBackgroundPermissionsAsync();
    }
    if (id === 'camera') await ImagePicker.requestCameraPermissionsAsync();
    await refresh();
  };

  return (
    <SetupScreenLayout title="Permissions" subtitle="Give permissions to get trips">
      <AppScrollView contentContainerClassName="gap-3 px-5 pb-10 pt-4">
        <AppView
          className={`rounded-2xl px-4 py-3 ${allGranted ? 'bg-emerald-500/10' : 'bg-brand-soft'}`}
        >
          <AppText
            className={`text-[13px] font-semibold ${
              allGranted ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground-secondary'
            }`}
          >
            {allGranted
              ? 'All permissions are allowed. You are ready to take trips.'
              : 'These are optional now, but you need them to go online and take trips.'}
          </AppText>
        </AppView>
        {/* A permission this phone doesn't use (null) is not shown. */}
        {ITEMS.filter((item) => permissions?.[item.id] !== null).map((item) => {
          const granted = permissions?.[item.id]?.granted === true;
          return (
            <AppPressable
              key={item.id}
              // Not `disabled`: that dims the row. Tapping an allowed one does nothing (see request).
              onPress={() => request(item.id)}
              pressScale={granted ? 1 : 0.98}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}${granted ? ', allowed' : ', tap to allow'}`}
              className="flex-row items-center gap-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm"
            >
              <AppView className="h-10 w-10 items-center justify-center rounded-xl bg-brand-soft">
                <Icon name={item.icon} size={19} tone="brand" />
              </AppView>
              <AppView className="flex-1">
                <AppText className="text-[15px] font-bold text-foreground">{item.title}</AppText>
                <AppText className="mt-0.5 text-[12px] leading-4 text-muted">{item.body}</AppText>
              </AppView>
              {granted ? (
                <AppView row className="items-center gap-1">
                  <AppText className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                    Allowed
                  </AppText>
                  <Icon name="checkmark.circle.fill" size={22} tone="success" />
                </AppView>
              ) : (
                <AppView className="rounded-full bg-brand px-3 py-1.5">
                  <AppText className="text-[12px] font-bold text-brand-foreground">Allow</AppText>
                </AppView>
              )}
            </AppPressable>
          );
        })}
      </AppScrollView>
    </SetupScreenLayout>
  );
}
