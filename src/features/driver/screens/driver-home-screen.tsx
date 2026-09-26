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
import { getErrorMessage } from '@/lib/api/api-error';
import type { JobOffer, SetupStep } from '@/lib/api/models';
import { greetingFor } from '@/lib/format';

import { ActiveDeliveryCard } from '../components/active-delivery-card';
import { DailyCheckBanner } from '../components/daily-check-banner';
import { DeliveryRequestCard } from '../components/delivery-request-card';
import { DriverOnlineToggle } from '../components/driver-online-toggle';
import { DriverSetupChecklist } from '../components/driver-setup-checklist';
import { DriverStatsRow } from '../components/driver-stats-row';
import { WelcomeBonusModal } from '../components/welcome-bonus-modal';

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

  // A new offer takes over the screen, like a ringing call.
  const shownOfferIds = useRef(new Set<string>());
  const newestOffer = offers.at(-1);
  useEffect(() => {
    if (!isFocused || activeJob || !newestOffer) return;
    if (shownOfferIds.current.has(newestOffer.id)) return;
    shownOfferIds.current.add(newestOffer.id);
    router.push({ pathname: '/incoming-job', params: { offerId: newestOffer.id } });
  }, [isFocused, activeJob, newestOffer, router]);

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
    : `Complete your ${profile.pendingSteps.map((s) => STEP_LABEL[s]).join(', ')} to go online`;

  const handleToggle = (next: boolean) => {
    if (next && !profile.canGoOnline) {
      Alert.alert('Finish setup first', blockedReason ?? undefined);
      return;
    }
    setOnline.mutate(next, {
      onError: (error) => Alert.alert('Could not update status', getErrorMessage(error)),
    });
  };

  const openOffer = (offer: JobOffer) =>
    router.push({ pathname: '/incoming-job', params: { offerId: offer.id } });

  const firstName = profile.name.split(' ')[0] || 'Partner';
  const showBonus =
    !profile.welcomeBonus.seen && profile.welcomeBonus.status === 'active' && isFocused;

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />

      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 6 }}
        className="z-20 bg-background px-5 pb-2"
      >
        <AppView row className="items-center justify-between">
          <AppView className="flex-1 pr-3">
            <AppText className="text-[28px] font-black text-foreground" numberOfLines={1}>
              {greetingFor()}, {firstName}
            </AppText>
            <AppText className="mt-0.5 text-[15px] font-medium text-muted" numberOfLines={1}>
              {profile.vehicle
                ? `${profile.vehicle.vehicleTypeName} · ${profile.vehicle.plateNumber}`
                : 'Add your vehicle to start earning'}
            </AppText>
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
        contentContainerClassName="px-4 pb-28 pt-2 gap-4"
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
        <DriverOnlineToggle
          isOnline={profile.isOnline}
          onToggle={handleToggle}
          blockedReason={blockedReason}
          busy={setOnline.isPending}
        />

        <DriverStatsRow
          tripsToday={todayQuery.data?.trips ?? 0}
          earningsToday={todayQuery.data?.totalEarnings ?? 0}
          walletBalance={profile.walletBalance}
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
