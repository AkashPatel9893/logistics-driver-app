import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, useWindowDimensions } from 'react-native';
import { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import {
  AnimatedView,
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  Avatar,
  Icon,
} from '@/components/ui';
import { showsDriverId } from '@/features/fleet/mode-switch';
import { useFleetStore } from '@/features/fleet/use-fleet-store';
import { useDriverProfile } from '@/hooks/use-driver';
import { DURATION, ENTER_EASE_OUT, SHEET_EASE } from '@/lib/motion';

type MenuIcon = Parameters<typeof Icon>[0]['name'];

interface MenuItem {
  icon: MenuIcon;
  label: string;
  sublabel: string;
  route: Href;
  /** Only for someone driving: left out of a fleet owner's menu. */
  driverOnly?: boolean;
}

const ITEMS: MenuItem[] = [
  {
    icon: 'wallet.pass.fill',
    label: 'Earnings',
    sublabel: 'Withdraw to bank, history',
    route: '/earnings',
  },
  {
    icon: 'gift.fill',
    label: 'Incentives',
    sublabel: 'Know how you get paid',
    route: '/incentives',
  },
  {
    icon: 'tag.fill',
    label: 'Rewards',
    driverOnly: true,
    sublabel: 'Insurance and discounts',
    route: '/rewards',
  },
  {
    icon: 'box.truck',
    label: 'My trips',
    driverOnly: true,
    sublabel: 'Completed trips by day, week or month',
    route: '/(tabs)/orders',
  },
  {
    icon: 'banknote',
    label: 'Wallet',
    sublabel: 'Balance and transactions',
    route: '/wallet',
  },
  {
    icon: 'person.text.rectangle',
    label: 'Ryno ID card',
    sublabel: 'Your partner identity',
    route: '/driver-id-card',
  },
  {
    icon: 'questionmark.circle',
    label: 'Help',
    sublabel: 'Get support, SOS and safety',
    route: '/support',
  },
  {
    icon: 'person.badge.plus',
    label: 'Refer friends',
    driverOnly: true,
    sublabel: 'Earn when they start driving',
    route: '/refer',
  },
];

/** The panel takes this share of the screen, up to a fixed width on large phones and tablets. */
const PANEL_SHARE = 0.82;
const PANEL_MAX_WIDTH = 340;

export interface HomeMenuProps {
  visible: boolean;
  onClose: () => void;
}

/** Side menu opened from Home: profile on top, then the main places a driver goes to. */
export function HomeMenu({ visible, onClose }: HomeMenuProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile } = useDriverProfile();
  const isOwner = useFleetStore.use.dashboardRole() === 'owner';
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(width * PANEL_SHARE, PANEL_MAX_WIDTH);
  // 0 closed, 1 open. One value drives the panel and the dimming, so they always move together.
  const progress = useSharedValue(0);
  // The modal outlives `visible` until the panel has slid out; hiding it at once would cut that off.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  const open = () => {
    progress.set(withTiming(1, { duration: DURATION.sheet, easing: SHEET_EASE }));
  };

  useEffect(() => {
    if (visible || !mounted) return;
    progress.set(
      withTiming(0, { duration: DURATION.small, easing: ENTER_EASE_OUT }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(setMounted, false);
      }),
    );
  }, [visible, mounted, progress]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.get(), [0, 1], [-panelWidth, 0]) }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));

  const go = (route: Href) => {
    onClose();
    router.push(route);
  };

  return (
    <Modal
      visible={mounted}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      // Starts once the modal window is up, so no frames of the slide are lost.
      onShow={open}
      onRequestClose={onClose}
    >
      <AppView className="flex-1">
        {/* Dims the whole screen, behind the panel. */}
        <AnimatedView style={[StyleSheet.absoluteFill, backdropStyle]} className="bg-black/40">
          <AppPressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            className="flex-1"
          />
        </AnimatedView>

        <AnimatedView
          style={[
            {
              width: panelWidth,
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 12),
            },
            panelStyle,
          ]}
          className="flex-1 bg-background"
        >
          <AppPressable
            onPress={() => go(isOwner ? '/driver-profile' : '/my-profile')}
            accessibilityRole="button"
            accessibilityLabel="My profile"
            className="flex-row items-center gap-3.5 border-b border-border/70 bg-surface-muted px-5 py-5"
          >
            <Avatar name={profile?.name} size="lg" />
            <AppView className="flex-1">
              <AppText numberOfLines={1} className="text-[17px] font-black text-foreground">
                {profile?.name ?? 'My profile'}
              </AppText>
              {profile?.rating != null ? (
                <AppView row className="items-center gap-1">
                  <AppText className="text-[13px] font-semibold text-muted">
                    {profile.rating.toFixed(1)}
                  </AppText>
                  <Icon name="star.fill" size={12} color="#f59e0b" />
                </AppView>
              ) : null}
            </AppView>
            <Icon name="chevron.right" size={16} tone="icon-subtle" />
          </AppPressable>

          <AppScrollView showsVerticalScrollIndicator={false}>
            {ITEMS.filter((item) => {
              if (item.route === '/driver-id-card') return showsDriverId(profile, isOwner);
              return !(isOwner && item.driverOnly);
            }).map((item) => (
              <AppPressable
                key={item.label}
                onPress={() => go(item.route)}
                accessibilityRole="button"
                className="flex-row items-center gap-4 border-b border-border/60 px-5 py-4"
              >
                <AppView className="size-10 items-center justify-center rounded-full bg-surface-muted">
                  <Icon name={item.icon} size={18} tone="icon-strong" />
                </AppView>
                <AppView className="flex-1">
                  <AppText className="text-[16px] font-bold text-foreground">{item.label}</AppText>
                  <AppText className="text-[12px] text-muted">{item.sublabel}</AppText>
                </AppView>
              </AppPressable>
            ))}
          </AppScrollView>
        </AnimatedView>
      </AppView>
    </Modal>
  );
}
