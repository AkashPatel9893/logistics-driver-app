import { useRouter, type Href } from 'expo-router';
import { Modal } from 'react-native';
import { FadeIn, FadeOut, SlideInLeft, SlideOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AnimatedView,
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  Avatar,
  Icon,
} from '@/components/ui';
import { useDriverProfile } from '@/hooks/use-driver';
import { DURATION } from '@/lib/motion';

type MenuIcon = Parameters<typeof Icon>[0]['name'];

interface MenuItem {
  icon: MenuIcon;
  label: string;
  sublabel: string;
  route: Href;
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
    sublabel: 'Insurance and discounts',
    route: '/rewards',
  },
  {
    icon: 'box.truck',
    label: 'My trips',
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
    sublabel: 'Earn when they start driving',
    route: '/refer',
  },
];

export interface HomeMenuProps {
  visible: boolean;
  onClose: () => void;
}

/** Side menu opened from Home: profile on top, then the main places a driver goes to. */
export function HomeMenu({ visible, onClose }: HomeMenuProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile } = useDriverProfile();

  const go = (route: Href) => {
    onClose();
    router.push(route);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <AppView className="flex-1 flex-row">
        <AnimatedView
          entering={SlideInLeft.duration(DURATION.sheet)}
          exiting={SlideOutLeft.duration(DURATION.small)}
          style={{
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 12),
          }}
          className="w-[82%] max-w-[340px] bg-background"
        >
          <AppPressable
            onPress={() => go('/driver-profile')}
            accessibilityRole="button"
            accessibilityLabel="My profile"
            className="flex-row items-center gap-3.5 border-b border-border/70 bg-surface-muted px-5 py-5"
          >
            <Avatar name={profile?.name} size="lg" />
            <AppView className="flex-1">
              <AppText numberOfLines={1} className="text-[17px] font-black text-foreground">
                {profile?.name ?? 'My profile'}
              </AppText>
              <AppView row className="items-center gap-1">
                <AppText className="text-[13px] font-semibold text-muted">
                  {profile?.rating != null ? profile.rating.toFixed(1) : '--'}
                </AppText>
                <Icon name="star.fill" size={12} color="#f59e0b" />
              </AppView>
            </AppView>
            <Icon name="chevron.right" size={16} tone="icon-subtle" />
          </AppPressable>

          <AppScrollView showsVerticalScrollIndicator={false}>
            {ITEMS.map((item) => (
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

        <AnimatedView
          entering={FadeIn.duration(DURATION.small)}
          exiting={FadeOut.duration(DURATION.small)}
          className="flex-1 bg-black/40"
        >
          <AppPressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            className="flex-1"
          />
        </AnimatedView>
      </AppView>
    </Modal>
  );
}
