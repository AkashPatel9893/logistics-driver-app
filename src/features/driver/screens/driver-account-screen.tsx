import { useWallet } from '@/hooks/use-earnings';
import { switchDashboardRole } from '@/features/fleet/switch-role';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  Icon,
  type IconName,
} from '@/components/ui';
import { logOut, useAuthStore } from '@/features/auth/use-auth-store';
import { DriveVehiclePicker, RoleSwitcher } from '@/features/fleet/components';
import {
  modeSwitchState,
  registrationLinkLabel,
  showsDriverId,
} from '@/features/fleet/mode-switch';
import { useDriveVehicle } from '@/features/fleet/use-drive-vehicle';
import { useFleetStore } from '@/features/fleet/use-fleet-store';
import type { DashboardRole, FleetVehicle } from '@/features/fleet/types';
import { useDriverProfile, useSetOnline } from '@/hooks/use-driver';
import { useFleetCompany, useFleetLinkRequests, useFleetVehicles } from '@/hooks/use-fleet';
import { useActiveJob } from '@/hooks/use-jobs';
import { formatRupees } from '@/lib/format';

interface MenuItem {
  icon: IconName;
  label: string;
  sublabel?: string;
  route: string;
  badge?: string;
}

const NEEDS_ATTENTION = 'Needs attention';

export function DriverAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: profile } = useDriverProfile();
  const user = useAuthStore.use.user();
  const setOnline = useSetOnline();
  const { data: company } = useFleetCompany();
  const { data: vehicles = [] } = useFleetVehicles();
  const { data: activeJob } = useActiveJob();
  const dashboardRole = useFleetStore.use.dashboardRole();
  const isOwner = dashboardRole === 'owner';
  // An owner's trips are paid into the fleet wallet.
  const { data: wallet } = useWallet(isOwner ? 'fleet' : 'driver');
  const { data: joinRequests = [] } = useFleetLinkRequests({ enabled: isOwner });
  const setDashboardRole = switchDashboardRole;
  const modeSwitch = modeSwitchState(profile);
  const { assigningVehicleId, driveVehicle } = useDriveVehicle();
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);

  // A Fleet Owner with no approved driver profile has no other way into driver registration.
  const openDriverRegistration = () => {
    setDashboardRole('driver');
    router.replace('/registration' as any);
  };

  const handleChangeRole = (next: DashboardRole) => {
    if (!modeSwitch.allowed || next === dashboardRole) return;
    if (activeJob) {
      Alert.alert('Finish your delivery first', 'You can switch modes once this delivery is done.');
      return;
    }
    if (profile?.isOnline && next === 'owner') {
      Alert.alert(
        'Go offline first',
        'Go offline from Home before switching to Fleet Owner mode, so you stop getting delivery requests.',
      );
      return;
    }
    // An owner who is not driving any vehicle yet picks the one to drive before entering Driver mode.
    // Their own (non-fleet) vehicle counts: it is not in the fleet list.
    const isDrivingAVehicle =
      profile?.vehicle != null || vehicles.some((vehicle) => vehicle.driver?.isOwnerSelf);
    if (next === 'driver' && !isDrivingAVehicle) {
      setShowVehiclePicker(true);
      return;
    }
    setDashboardRole(next);
    router.navigate('/home');
  };

  const handleDriveVehicle = async (vehicle: FleetVehicle) => {
    if (!(await driveVehicle(vehicle))) return;
    setShowVehiclePicker(false);
    setDashboardRole('driver');
    router.navigate('/home');
  };

  const handleAddVehicleToDrive = () => {
    setShowVehiclePicker(false);
    router.push('/setup-vehicle');
  };

  const name = (isOwner ? company?.ownerName : null) || profile?.name || '—';
  // The backend may send the rating as a string (decimal) or a number.
  const rating = profile?.rating != null ? Number(profile.rating) : NaN;
  const hasRating = Number.isFinite(rating);

  // Company and fleet management: only in Fleet Owner mode.
  const FLEET_ITEMS: MenuItem[] = [
    {
      icon: 'building.2',
      label: 'Company Details',
      sublabel: company?.companyName ? 'Your company details' : 'Register company profile',
      route: '/company-details',
    },
    {
      icon: 'box.truck.fill',
      label: 'My Fleet & Vehicles',
      sublabel: `${vehicles.length} ${vehicles.length === 1 ? 'vehicle' : 'vehicles'} in your fleet`,
      route: '/driver-profile',
    },
    {
      icon: 'person.badge.plus',
      label: 'Drivers',
      sublabel: joinRequests.length > 0 ? NEEDS_ATTENTION : 'Your drivers and join requests',
      route: '/fleet-drivers',
    },
  ];

  // Numbers and statuses are shown on their own screens; here only what needs the partner.
  const documentsNeedAttention = profile?.kyc?.status === 'rejected';

  const VEHICLE_ITEM: MenuItem = {
    icon: 'box.truck.fill',
    label: 'My vehicle',
    sublabel:
      profile?.vehicle?.status === 'rejected' ? NEEDS_ATTENTION : 'Vehicle details and papers',
    route: '/setup-vehicle',
  };

  const ID_CARD_ITEM: MenuItem = {
    icon: 'person.text.rectangle',
    label: 'Ryno ID card',
    sublabel: 'Your partner identity and approval status',
    route: '/driver-id-card',
  };

  const MENU_ITEMS: MenuItem[] = [
    ...(isOwner ? FLEET_ITEMS : []),
    ...(isOwner ? [] : [VEHICLE_ITEM]),
    {
      icon: 'gift.fill',
      label: 'Incentives',
      sublabel: 'Daily, weekly and bonus rewards',
      route: '/incentives',
    },
    ...(showsDriverId(profile, isOwner) ? [ID_CARD_ITEM] : []),
    {
      icon: 'checkmark.shield.fill',
      label: 'My documents',
      sublabel: documentsNeedAttention
        ? NEEDS_ATTENTION
        : isOwner
          ? 'ID and profile photo'
          : 'Licence and ID',
      route: '/setup-kyc',
    },
    {
      icon: 'banknote',
      label: 'Bank Details & Payouts',
      sublabel:
        profile?.bank?.status === 'rejected' ? NEEDS_ATTENTION : 'Account for wallet payouts',
      route: '/setup-bank',
    },
  ];

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your driver account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          // Stop receiving offers before the session ends.
          if (profile?.isOnline) await setOnline.mutateAsync(false).catch(() => undefined);
          logOut();
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
        {/* Who is signed in. A rider taps through to My profile; for an owner it is information
            only, since My Fleet & Vehicles below opens the fleet profile. */}
        <AppPressable
          onPress={() => router.push('/my-profile')}
          // Not `disabled`: that fades the card.
          pointerEvents={isOwner ? 'none' : 'auto'}
          accessibilityRole={isOwner ? 'summary' : 'button'}
          pressScale={0.98}
          className="rounded-3xl border border-border bg-card p-5 shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800"
        >
          <AppView row className="items-center gap-4">
            <AppView className="h-16 w-16 items-center justify-center rounded-full bg-brand/10 border-2 border-brand/30">
              <AppText className="text-[24px] font-black text-brand">
                {name ? name.slice(0, 1).toUpperCase() : '?'}
              </AppText>
            </AppView>

            <AppView className="flex-1">
              <AppText className="text-[18px] font-black text-foreground">{name}</AppText>
              {user?.phone || profile?.phone ? (
                <AppText className="text-[13px] text-muted">
                  Phone: {user?.phone || profile?.phone}
                </AppText>
              ) : null}
              {hasRating || (isOwner && vehicles.length > 0) ? (
                <AppView row className="mt-1.5 items-center gap-2">
                  {hasRating ? (
                    <AppView
                      row
                      className="items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5"
                    >
                      <Icon name="star.fill" size={12} color="#f59e0b" />
                      <AppText className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                        {rating.toFixed(1)}
                      </AppText>
                    </AppView>
                  ) : null}
                  {isOwner && vehicles.length > 0 ? (
                    <AppText className="text-[12px] font-medium text-foreground-secondary">
                      {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'}
                    </AppText>
                  ) : null}
                </AppView>
              ) : null}
            </AppView>

            {isOwner ? null : <Icon name="chevron.right" size={18} tone="icon-subtle" />}
          </AppView>
        </AppPressable>

        {/* Mode: Driver or Fleet Owner. Locked until the admin has verified the account. */}
        <AppView className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <AppView row className="items-center justify-between">
            <AppText className="text-[15px] font-black text-foreground">Switch mode</AppText>
            {!modeSwitch.allowed ? <Icon name="lock.fill" size={15} tone="icon-subtle" /> : null}
          </AppView>
          <AppText className="mb-3 mt-0.5 text-[12px] text-muted">
            {dashboardRole === 'driver' ? "You're in Driver mode" : "You're in Fleet Owner mode"}
          </AppText>
          <RoleSwitcher
            role={dashboardRole}
            onChangeRole={handleChangeRole}
            locked={!modeSwitch.allowed}
          />
          <DriveVehiclePicker
            visible={showVehiclePicker}
            vehicles={vehicles}
            assigningVehicleId={assigningVehicleId}
            onSelect={handleDriveVehicle}
            onAddVehicle={handleAddVehicleToDrive}
            onClose={() => setShowVehiclePicker(false)}
          />
          {modeSwitch.lockedReason ? (
            <AppText className="mt-3 text-[12px] text-muted">{modeSwitch.lockedReason}</AppText>
          ) : null}
          {!modeSwitch.allowed && profile && dashboardRole === 'owner' ? (
            <Button
              variant="outline"
              size="md"
              className="mt-3"
              label={registrationLinkLabel(profile)}
              onPress={openDriverRegistration}
            />
          ) : null}
        </AppView>

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
            <AppText className="mt-0.5 text-[11px] text-muted">FAQs & partner care</AppText>
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
              {wallet ? formatRupees(wallet.balance) : '—'}
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
          RYNO Partner • Version {Constants.expoConfig?.version ?? '1.0.0'}
        </AppText>
      </AppScrollView>
    </AppView>
  );
}
