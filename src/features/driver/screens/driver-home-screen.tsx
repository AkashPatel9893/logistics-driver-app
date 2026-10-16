import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, Image, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppPressable,
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  Icon,
} from '@/components/ui';
import { useDriverProfile, useMarkWelcomeBonusSeen, useSetOnline } from '@/hooks/use-driver';
import { useEarnings } from '@/hooks/use-earnings';
import { useActiveJob, useOffers } from '@/hooks/use-jobs';
import { useFleetStore } from '@/features/fleet/use-fleet-store';
import { FleetStatsRow, FleetVehiclesSection, RoleSwitcher } from '@/features/fleet/components';
import { getErrorMessage } from '@/lib/api/api-error';
import type { JobOffer, SetupStep } from '@/lib/api/models';
import { canDrawOverlays, isBubbleSupported, openOverlaySettings } from '@/lib/driver-bubble';
import { greetingFor } from '@/lib/format';

import { ActiveDeliveryCard } from '../components/active-delivery-card';
import { DailyCheckBanner } from '../components/daily-check-banner';
import { DeliveryRequestCard } from '../components/delivery-request-card';
import { DriverOnlineToggle } from '../components/driver-online-toggle';
import { DriverSetupChecklist } from '../components/driver-setup-checklist';
import { DriverStatsRow } from '../components/driver-stats-row';
import { WelcomeBonusModal } from '../components/welcome-bonus-modal';

let overlayPromptShown = false;

/**
 * Android: ask once per launch for "Display over other apps", which powers the
 * floating bubble and lets new requests open over Google Maps.
 */
function askForOverlayPermission() {
  if (overlayPromptShown || !isBubbleSupported || canDrawOverlays()) return;
  overlayPromptShown = true;
  Alert.alert(
    "Don't miss requests while navigating",
    'Allow RYNO Partner to display over other apps. You will see a floating RYNO bubble on top of Google Maps, and new requests will pop up instantly.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Allow', onPress: openOverlaySettings },
    ],
  );
}

const STEP_LABEL: Record<SetupStep, string> = {
  vehicle: 'vehicle',
  kyc: 'KYC',
  bank: 'bank details',
};

export function DriverHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const profileQuery = useDriverProfile();
  const profile = profileQuery.data;
  const activeJobQuery = useActiveJob();
  const activeJob = activeJobQuery.data ?? null;
  const offersQuery = useOffers(Boolean(profile?.isOnline) && !activeJob);
  const offers = offersQuery.data ?? [];
  const todayQuery = useEarnings('today');
  const setOnline = useSetOnline();
  const markBonusSeen = useMarkWelcomeBonusSeen();

  // Fleet Owner state
  const dashboardRole = useFleetStore.use.dashboardRole();
  const setDashboardRole = useFleetStore.use.setDashboardRole();
  const vehicles = useFleetStore.use.vehicles();
  const company = useFleetStore.use.company();
  const activeDriverVehicleId = useFleetStore.use.activeDriverVehicleId();
  const setActiveDriverVehicleId = useFleetStore.use.setActiveDriverVehicleId();

  // A new offer takes over the screen, like a ringing call.
  const shownOfferIds = useRef(new Set<string>());
  const newestOffer = offers.at(-1);
  useEffect(() => {
    if (!isFocused || activeJob || !newestOffer || dashboardRole !== 'driver') return;
    if (shownOfferIds.current.has(newestOffer.id)) return;
    shownOfferIds.current.add(newestOffer.id);
    router.push({ pathname: '/incoming-job', params: { offerId: newestOffer.id } });
  }, [isFocused, activeJob, newestOffer, router, dashboardRole]);

  if (!profile) {
    return (
      <AppView className="flex-1 items-center justify-center bg-background p-6">
        {profileQuery.isError ? (
          <>
            <AppText className="text-center text-[15px] text-muted">
              {getErrorMessage(profileQuery.error)}
            </AppText>
            <Button label="Retry" className="mt-4" onPress={() => profileQuery.refetch()} />
          </>
        ) : (
          <AppSpinner size="large" />
        )}
      </AppView>
    );
  }

  const blockedReason = profile.canGoOnline
    ? null
    : profile.pendingSteps.length > 0
      ? `Complete your ${profile.pendingSteps.map((s) => STEP_LABEL[s]).join(', ')} to go online`
      : profile.onboarding.status === 'in_progress'
        ? 'Submit your application for review to go online.'
        : profile.onboarding.status === 'rejected'
          ? (profile.onboarding.rejectionReason ?? 'Your application needs changes.')
          : 'Your application is being reviewed. You can go online once it is approved.';

  const handleToggle = (next: boolean) => {
    if (next && !profile.canGoOnline) {
      Alert.alert('Finish setup first', blockedReason ?? undefined);
      return;
    }
    setOnline.mutate(next, {
      onSuccess: (updated) => {
        if (updated.isOnline) askForOverlayPermission();
      },
      onError: (error) => Alert.alert('Could not update status', getErrorMessage(error)),
    });
  };

  const openOffer = (offer: JobOffer) =>
    router.push({ pathname: '/incoming-job', params: { offerId: offer.id } });

  const firstName =
    profile.name.split(' ')[0] || (company.ownerName ? company.ownerName.split(' ')[0] : 'Partner');
  const showBonus =
    !profile.welcomeBonus.seen && profile.welcomeBonus.status === 'active' && isFocused;

  const activeDriverVehicle = vehicles.find((v) => v.id === activeDriverVehicleId) ?? vehicles[0];

  const vehicleSubtitle = profile.vehicle
    ? `${profile.vehicle.vehicleTypeName} · ${profile.vehicle.plateNumber}`
    : activeDriverVehicle
      ? `${activeDriverVehicle.vehicleTypeName} · ${activeDriverVehicle.plateNumber}`
      : 'Mini truck · KA 03 MX 2814';

  const handleSwitchActiveVehicle = () => {
    if (vehicles.length <= 1) return;
    Alert.alert('Switch Active Vehicle', 'Select which vehicle you are driving right now:', [
      ...vehicles.map((v) => ({
        text: `${v.model} (${v.plateNumber})${v.id === activeDriverVehicle?.id ? '  ✓ Active' : ''}`,
        onPress: () => setActiveDriverVehicleId(v.id),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const isDriverMode = dashboardRole === 'driver';

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />

      {/* Header bar */}
      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 6 }}
        className="z-20 bg-background px-5 pb-3"
      >
        <AppView row className="items-center justify-between">
          <AppView className="flex-1 pr-3">
            <AppText className="text-[28px] font-black text-foreground" numberOfLines={1}>
              {greetingFor()}, {firstName}
            </AppText>
            <AppPressable
              onPress={handleSwitchActiveVehicle}
              disabled={vehicles.length <= 1}
              className="flex-row items-center gap-1.5 mt-0.5"
            >
              <AppText className="text-[15px] font-medium text-muted" numberOfLines={1}>
                {vehicleSubtitle}
              </AppText>
              {vehicles.length > 1 ? (
                <Icon name="chevron.down" size={13} tone="icon-subtle" />
              ) : null}
            </AppPressable>
          </AppView>

          <AppPressable
            onPress={() => router.push('/support')}
            accessibilityLabel="Help and support"
            className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800"
          >
            <Icon name="questionmark.circle" size={20} tone="icon-strong" />
          </AppPressable>
        </AppView>

        {/* Role toggle: Driver | Fleet Owner */}
        <AppView className="mt-4">
          <RoleSwitcher role={dashboardRole} onChangeRole={setDashboardRole} />
        </AppView>
      </AppView>

      <AppScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-28 pt-1 gap-4"
        refreshControl={
          <RefreshControl
            refreshing={profileQuery.isRefetching}
            onRefresh={() => {
              profileQuery.refetch();
              activeJobQuery.refetch();
              offersQuery.refetch();
              todayQuery.refetch();
            }}
          />
        }
      >
        {isDriverMode ? (
          /* ================= DRIVER MODE ================= */
          <>
            <DriverOnlineToggle
              isOnline={profile.isOnline}
              onToggle={handleToggle}
              blockedReason={blockedReason}
              busy={setOnline.isPending}
            />

            <DriverStatsRow
              tripsToday={todayQuery.data?.trips ?? 0}
              earningsToday={todayQuery.data?.totalEarnings ?? 0}
              walletBalance={profile.walletBalance || 1000}
            />

            {activeJob ? <ActiveDeliveryCard job={activeJob} /> : null}

            {!profile.canGoOnline ? (
              <DriverSetupChecklist profile={profile} />
            ) : (
              <DailyCheckBanner check={profile.dailyCheck} />
            )}

            {profile.isOnline && !activeJob ? (
              offers.length > 0 ? (
                <AppView className="mt-1 gap-3">
                  <AppText className="px-1 text-[20px] font-black text-foreground">
                    New delivery request
                  </AppText>
                  {offers.map((offer) => (
                    <DeliveryRequestCard key={offer.id} offer={offer} onOpen={openOffer} />
                  ))}
                </AppView>
              ) : (
                <AppView className="items-center justify-center rounded-2xl border border-dashed border-border p-6">
                  <AppSpinner />
                  <AppText className="mt-3 text-[14px] font-bold text-foreground">
                    Looking for deliveries near you…
                  </AppText>
                  <AppText className="mt-1 text-center text-[12px] text-muted">
                    Keep the app open. New requests appear here and ring on screen.
                  </AppText>
                </AppView>
              )
            ) : null}
          </>
        ) : (
          /* ================= FLEET OWNER MODE ================= */
          <>
            <FleetStatsRow
              vehiclesCount={vehicles.length}
              totalEarnings={todayQuery.data?.totalEarnings ?? 0}
              walletBalance={profile.walletBalance || 1000}
              onPressVehicles={() => router.push('/driver-profile')}
            />

            {/* If fleet has no vehicles yet, show finish setting up checklist */}
            {vehicles.length === 0 ? (
              <DriverSetupChecklist profile={profile} />
            ) : (
              /* My Vehicles List matching Screenshot 1 Screen 4 */
              <FleetVehiclesSection />
            )}
          </>
        )}

        {/* Hero Banner */}
        <AppView className="relative overflow-hidden rounded-[26px] bg-[#FF5722] p-5 shadow-md">
          <AppView className="max-w-[62%]">
            <AppText className="text-[17px] font-bold text-white/95">Delivering More</AppText>
            <AppText className="mt-0.5 text-[28px] font-black leading-tight text-white">
              Worrying{'\n'}Less.
            </AppText>
          </AppView>
          <Image
            source={require('../../../../assets/images/HeroTruck.png')}
            style={{ position: 'absolute', bottom: -10, right: -15, width: 170, height: 135 }}
            resizeMode="contain"
          />
        </AppView>
      </AppScrollView>

      <WelcomeBonusModal
        bonus={profile.welcomeBonus}
        visible={showBonus && !markBonusSeen.isPending}
        onDismiss={() => markBonusSeen.mutate()}
      />
    </AppView>
  );
}
