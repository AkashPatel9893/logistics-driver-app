import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  FocusAwareStatusBar,
  Icon,
  type IconName,
} from '@/components/ui';
import { signOut } from '@/features/auth/use-auth-store';
import { useDriverStore } from '@/stores/driver-store';

interface MenuItem {
  icon: IconName;
  label: string;
  sublabel?: string;
  route: string;
  badge?: string;
}

export function DriverAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const name = useDriverStore((s) => s.name);
  const phone = useDriverStore((s) => s.phone);
  const rating = useDriverStore((s) => s.rating);
  const tripsCount = useDriverStore((s) => s.tripsCount);
  const vehicle = useDriverStore((s) => s.vehicle);
  const walletBalance = useDriverStore((s) => s.walletBalance);

  const MENU_ITEMS: MenuItem[] = [
    {
      icon: 'person.fill',
      label: 'Driver Profile & Badges',
      sublabel: 'View verification status and personal info',
      route: '/driver-profile',
    },
    {
      icon: 'box.truck.fill',
      label: 'Vehicle Details',
      sublabel: `${vehicle.model} • ${vehicle.plateNumber}`,
      route: '/setup-vehicle',
    },
    {
      icon: 'checkmark.shield.fill',
      label: 'KYC Documents',
      sublabel: 'DL, PAN & Aadhaar records',
      route: '/setup-kyc',
    },
    {
      icon: 'banknote',
      label: 'Bank Details & Payouts',
      sublabel: 'Bank account and settlement settings',
      route: '/setup-bank',
    },
    {
      icon: 'calendar',
      label: 'Daily Shift Verification',
      sublabel: 'Earn ₹50 bonus daily selfie check',
      route: '/daily-check',
      badge: '+₹50',
    },
    {
      icon: 'questionmark.circle',
      label: 'Help & 24/7 Driver Support',
      sublabel: 'Instant assistance and ticketing',
      route: '/support',
    },
  ];

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your driver account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          signOut();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />

      {/* Top Header */}
      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        className="border-b border-border/80 bg-background/95 px-5 pb-3.5 backdrop-blur-md"
      >
        <AppText className="text-[24px] font-black text-foreground">My Account</AppText>
      </AppView>

      <AppScrollView
        contentContainerClassName="px-5 pb-36 pt-4 gap-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Driver Profile Header Card */}
        <AppPressable
          onPress={() => router.push('/driver-profile')}
          pressScale={0.98}
          className="rounded-3xl border border-border bg-card p-5 shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800"
        >
          <AppView row className="items-center gap-4">
            <AppView className="h-16 w-16 items-center justify-center rounded-full bg-brand/10 border-2 border-brand/30">
              <AppText className="text-[24px] font-black text-brand">
                {name ? name.slice(0, 1).toUpperCase() : 'R'}
              </AppText>
            </AppView>

            <AppView className="flex-1">
              <AppText className="text-[18px] font-black text-foreground">
                {name || 'Rajesh Kumar'}
              </AppText>
              <AppText className="text-[13px] text-muted">{phone || '+91 98765 43210'}</AppText>

              <AppView row className="mt-1.5 items-center gap-2">
                <AppView
                  row
                  className="items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5"
                >
                  <Icon name="star.fill" size={12} color="#f59e0b" />
                  <AppText className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                    {rating} ({tripsCount} trips)
                  </AppText>
                </AppView>
                <AppText className="text-[12px] font-medium text-foreground-secondary">
                  • {vehicle.model}
                </AppText>
              </AppView>
            </AppView>

            <Icon name="chevron.right" size={18} tone="icon-subtle" />
          </AppView>
        </AppPressable>

        {/* Quick Action Cards: Support & Wallet */}
        <AppView row className="gap-3">
          <AppPressable
            onPress={() => router.push('/support')}
            pressScale={0.96}
            className="flex-1 rounded-2xl border border-border bg-card p-4 shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800"
          >
            <AppView className="h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
              <Icon name="questionmark.circle" size={20} tone="brand" />
            </AppView>
            <AppText className="mt-2.5 text-[14px] font-bold text-foreground">
              Help & Support
            </AppText>
            <AppText className="mt-0.5 text-[11px] text-muted">24/7 dedicated desk</AppText>
          </AppPressable>

          <AppPressable
            onPress={() => router.push('/wallet')}
            pressScale={0.96}
            className="flex-1 rounded-2xl border border-border bg-card p-4 shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800"
          >
            <AppView className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Icon name="banknote" size={20} color="#10b981" />
            </AppView>
            <AppText className="mt-2.5 text-[14px] font-bold text-foreground">My Wallet</AppText>
            <AppText className="mt-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              ₹{walletBalance.toLocaleString('en-IN')}
            </AppText>
          </AppPressable>
        </AppView>

        {/* Menu Items List */}
        <AppView className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
          {MENU_ITEMS.map((item, idx) => (
            <AppPressable
              key={item.label}
              onPress={() => router.push(item.route as any)}
              pressScale={0.98}
              className={`flex-row items-center justify-between p-4 ${
                idx !== MENU_ITEMS.length - 1 ? 'border-b border-border/60' : ''
              } active:bg-neutral-100 dark:active:bg-neutral-800`}
            >
              <AppView row className="flex-1 items-center gap-3.5">
                <AppView className="h-10 w-10 items-center justify-center rounded-xl bg-surface-muted">
                  <Icon name={item.icon} size={18} tone="foreground" />
                </AppView>
                <AppView className="flex-1 pr-2">
                  <AppText className="text-[14px] font-bold text-foreground">{item.label}</AppText>
                  {item.sublabel ? (
                    <AppText className="text-[12px] text-muted" numberOfLines={1}>
                      {item.sublabel}
                    </AppText>
                  ) : null}
                </AppView>
              </AppView>

              <AppView row className="items-center gap-2">
                {item.badge ? (
                  <AppView className="rounded-full bg-brand px-2 py-0.5">
                    <AppText className="text-[10px] font-black text-white">{item.badge}</AppText>
                  </AppView>
                ) : null}
                <Icon name="chevron.right" size={16} tone="icon-subtle" />
              </AppView>
            </AppPressable>
          ))}
        </AppView>

        {/* Logout Button */}
        <AppPressable
          onPress={handleLogout}
          pressScale={0.97}
          className="flex-row items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 py-3.5 active:bg-red-500/20"
        >
          <Icon name="xmark" size={16} color="#ef4444" />
          <AppText className="text-[14px] font-bold text-red-600 dark:text-red-400">
            Log Out
          </AppText>
        </AppPressable>

        <AppText className="text-center text-[11px] text-muted">
          Logistics Driver App • Version 1.0.0 (Production)
        </AppText>
      </AppScrollView>
    </AppView>
  );
}
