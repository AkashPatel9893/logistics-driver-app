import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { useDriverProfile, useMyVehicles, useSetOnline } from '@/hooks/use-driver';
import { useEarnings, useWallet } from '@/hooks/use-earnings';
import { useFleetCompany, useFleetVehicles } from '@/hooks/use-fleet';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useActiveJob, useOffers } from '@/hooks/use-jobs';
import { useFleetStore } from '@/features/fleet/use-fleet-store';
import { RegistrationProgressCard } from '@/features/registration/registration-progress-card';
import { syncOnboardingStatus } from '@/features/auth/use-auth-store';
import {
  DriveVehiclePicker,
  FleetStatsRow,
  FleetAttentionSection,
  FleetVehiclesSection,
  JoinRequestsBanner,
} from '@/features/fleet/components';
import { useDriveVehicle } from '@/features/fleet/use-drive-vehicle';
import type { FleetVehicle } from '@/features/fleet/types';
import { getErrorMessage } from '@/lib/api/api-error';
import { eligibilityMessage } from '@/lib/api/eligibility-reason';
import type { DocumentAlert, JobOffer, SetupStep } from '@/lib/api/models';
import { canDrawOverlays, isBubbleSupported, openOverlaySettings } from '@/lib/driver-bubble';
import { greetingFor } from '@/lib/format';

import { ActiveDeliveryCard } from '../components/active-delivery-card';
import { DeliveryRequestCard } from '../components/delivery-request-card';
import { DriverOnlineToggle } from '../components/driver-online-toggle';
import { HomeMenu } from '../components/home-menu';
import { EarningsStrip } from '../components/earnings-strip';
import { TripTracker } from '../components/trip-tracker';

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

const DOCUMENT_LABEL: Record<string, string> = {
  DRIVING_LICENCE: 'Driving licence',
  RC: 'RC',
  INSURANCE: 'Vehicle insurance',
  PUC: 'PUC certificate',
  PERMIT: 'Permit',
  FITNESS: 'Fitness certificate',
  FITNESS_CERTIFICATE: 'Fitness certificate',
};

function alertText(alert: DocumentAlert) {
  if (alert.message) return alert.message;
  const name = DOCUMENT_LABEL[alert.documentType] ?? alert.documentType.replace(/_/g, ' ');
  if (alert.expired) return `Your ${name} has expired. Upload a new one to go online.`;
  if (alert.daysLeft !== null)
    return `Your ${name} expires in ${alert.daysLeft} ${alert.daysLeft === 1 ? 'day' : 'days'}. Upload the new one in time.`;
  return `Your ${name} expires soon. Upload the new one in time.`;
}

/** Expiring or expired documents: an expired one takes an idle driver offline. */
function DocumentAlertsCard({ alerts }: { alerts: DocumentAlert[] }) {
  const router = useRouter();
  const anyExpired = alerts.some((a) => a.expired);
  return (
    <AppPressable
      onPress={() => router.push('/registration')}
      accessibilityRole="button"
      className={`gap-1.5 rounded-2xl border p-4 ${
        anyExpired ? 'border-red-500/40 bg-red-500/10' : 'border-amber-500/40 bg-amber-500/10'
      }`}
    >
      <AppView row className="items-center gap-2">
        <Icon name="doc.text.fill" size={16} color={anyExpired ? '#dc2626' : '#d97706'} />
        <AppText className="flex-1 text-[14px] font-extrabold text-foreground">
          {anyExpired ? 'Document expired' : 'Document expiring soon'}
        </AppText>
        <Icon name="chevron.right" size={14} tone="icon-subtle" />
      </AppView>
      {alerts.map((alert) => (
        <AppText key={alert.documentType} className="text-[13px] text-foreground-secondary">
          {alertText(alert)}
        </AppText>
      ))}
    </AppPressable>
  );
}

export function DriverHomeScreen() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { refreshing, refresh } = usePullToRefresh();

  const profileQuery = useDriverProfile();
  const profile = profileQuery.data;
  const activeJobQuery = useActiveJob();
  const activeJob = activeJobQuery.data ?? null;
  const offersQuery = useOffers(Boolean(profile?.isOnline) && !activeJob);
  const offers = offersQuery.data ?? [];
  const todayQuery = useEarnings('today');
  const walletQuery = useWallet();
  const setOnline = useSetOnline();

  // Fleet Owner state
  const dashboardRole = useFleetStore.use.dashboardRole();
  const fleetVehiclesQuery = useFleetVehicles();
  const { data: vehicles = [] } = fleetVehiclesQuery;
  const { assigningVehicleId, driveVehicle, driveOwnVehicle } = useDriveVehicle();
  // The owner's own (non-fleet) vehicles, so the vehicle switch can also go back to one of them.
  const { data: myVehicles = [] } = useMyVehicles({ enabled: dashboardRole === 'driver' });
  const ownVehicles = myVehicles.filter(
    (v) => v.relationship_type !== 'FLEET_DRIVER' && v.assignment_status === 'ACTIVE',
  );
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const fleetCompanyQuery = useFleetCompany();
  const { data: company } = fleetCompanyQuery;

  // Like Rapido, a driver whose application is not approved yet lives on the Documents
  // screen, not Home: there is nothing to do here until then.
  const needsRegistration =
    dashboardRole === 'driver' && profile != null && profile.onboarding.status !== 'approved';
  useEffect(() => {
    if (dashboardRole !== 'driver' || !profile) return;
    // Keep the saved status in step with the profile, so the next launch opens the right screen.
    syncOnboardingStatus(profile.onboarding.status);
    if (needsRegistration) router.replace('/registration');
  }, [needsRegistration, dashboardRole, profile, router]);

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
    : profile.onboarding.status === 'approved'
      ? // Approved, but something blocks it (a document expired, the vehicle, the bank): the
        // backend's own reasons, since the checklist steps don't cover these.
        (eligibilityMessage(profile.onboarding.blockers, {
          fleetVehicle: profile.vehicle?.isFleet === true,
        }) ?? 'You cannot go online right now. Contact support.')
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
    profile.name.split(' ')[0] ||
    (company?.ownerName ? company.ownerName.split(' ')[0] : 'Partner');

  // The vehicle the owner is assigned to as its driver.
  const activeDriverVehicle = vehicles.find((v) => v.driver?.isOwnerSelf);

  const isDriverMode = dashboardRole === 'driver';
  // Fleet Owner mode is about the company, not the vehicle the owner rides as a driver.
  const vehicleSubtitle = !isDriverMode
    ? company?.companyName || 'Fleet Owner'
    : profile.vehicle
      ? `${profile.vehicle.vehicleTypeName} · ${profile.vehicle.plateNumber}`
      : activeDriverVehicle
        ? `${activeDriverVehicle.vehicleTypeName} · ${activeDriverVehicle.plateNumber}`
        : 'No vehicle assigned';

  const handleSwitchActiveVehicle = () => {
    if (profile.isOnline || activeJob) {
      Alert.alert(
        'Go offline first',
        'Finish your delivery and go offline before switching to another vehicle.',
      );
      return;
    }
    setShowVehiclePicker(true);
  };

  const handleDriveVehicle = async (vehicle: FleetVehicle) => {
    if (await driveVehicle(vehicle)) setShowVehiclePicker(false);
  };

  const handleDriveOwnVehicle = async (vehicleId: string) => {
    if (await driveOwnVehicle(vehicleId)) setShowVehiclePicker(false);
  };

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />

      {/* Header bar */}
      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 6 }}
        className="z-20 bg-background px-5 pb-3"
      >
        <AppView row className="items-center justify-between">
          <AppPressable
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="Open menu"
            className="mr-3 h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800"
          >
            <Icon name="line.3.horizontal" size={20} tone="icon-strong" />
          </AppPressable>
          <AppView className="flex-1 pr-3">
            <AppText className="text-[28px] font-black text-foreground" numberOfLines={1}>
              {greetingFor()}, {firstName}
            </AppText>
            <AppPressable
              onPress={handleSwitchActiveVehicle}
              disabled={dashboardRole !== 'driver' || vehicles.length === 0}
              className="flex-row items-center gap-1.5 mt-0.5"
            >
              <AppText className="text-[15px] font-medium text-muted" numberOfLines={1}>
                {vehicleSubtitle}
              </AppText>
              {dashboardRole === 'driver' && vehicles.length > 0 ? (
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
      </AppView>

      <AppScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-28 pt-1 gap-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              void refresh(async () => {
                await Promise.all([
                  profileQuery.refetch({ throwOnError: true }),
                  activeJobQuery.refetch({ throwOnError: true }),
                  ...(profile.isOnline && !activeJob
                    ? [offersQuery.refetch({ throwOnError: true })]
                    : []),
                  todayQuery.refetch({ throwOnError: true }),
                  walletQuery.refetch({ throwOnError: true }),
                  ...(dashboardRole === 'owner'
                    ? [
                        fleetVehiclesQuery.refetch({ throwOnError: true }),
                        fleetCompanyQuery.refetch({ throwOnError: true }),
                      ]
                    : []),
                ]);
              })
            }
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

            <EarningsStrip
              earningsToday={todayQuery.data?.totalEarnings}
              tripsToday={todayQuery.data?.trips}
              walletBalance={walletQuery.data?.balance}
            />

            <TripTracker completedTrips={profile.lifetimeTrips} />

            {profile.documentAlerts.length > 0 ? (
              <DocumentAlertsCard alerts={profile.documentAlerts} />
            ) : null}

            {activeJob ? <ActiveDeliveryCard job={activeJob} /> : null}

            {!profile.canGoOnline ? <RegistrationProgressCard profile={profile} /> : null}

            {profile.isOnline && !activeJob ? (
              offers.length > 0 ? (
                <AppView className="mt-1 gap-3">
                  <AppText className="px-1 text-[20px] font-black text-foreground">
                    {offers.length > 1 ? 'New delivery requests' : 'New delivery request'}
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
            <JoinRequestsBanner />

            <FleetStatsRow
              vehiclesCount={vehicles.length}
              onPressVehicles={() => router.push('/driver-profile')}
            />

            {/* Fleet setup covers the owner's own account, so no driver checklist here: an empty
                fleet gets its own "add your first vehicle" prompt. With vehicles, the count above
                links to the full list, and Home lists only the ones that need something. */}
            {vehicles.length === 0 ? (
              <FleetVehiclesSection />
            ) : (
              <FleetAttentionSection vehicles={vehicles} />
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

      <HomeMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />

      <DriveVehiclePicker
        visible={showVehiclePicker}
        vehicles={vehicles}
        assigningVehicleId={assigningVehicleId}
        title="Switch vehicle"
        subtitle="New delivery requests will be for the vehicle you choose."
        onSelect={handleDriveVehicle}
        activeVehicleId={profile.vehicle?.id ?? null}
        ownVehicles={ownVehicles}
        onSelectOwn={handleDriveOwnVehicle}
        onAddVehicle={() => {
          setShowVehiclePicker(false);
          router.push('/setup-vehicle');
        }}
        onClose={() => setShowVehiclePicker(false)}
      />
    </AppView>
  );
}
