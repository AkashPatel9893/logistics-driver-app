import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
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
} from '@/components/ui';
import { useCountdown } from '@/hooks/use-countdown';
import { useAcceptOffer, useOffers, useRejectOffer } from '@/hooks/use-jobs';
import { getErrorMessage } from '@/lib/api/api-error';
import type { JobOffer } from '@/lib/api/models';
import { formatDistance, formatMinutes, formatRupees } from '@/lib/format';

import { RouteMap } from '../components/route-map';

const DECLINE_REASONS = ['Too far from me', 'Low fare', 'Vehicle not suitable', 'Taking a break'];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <AppView className="flex-1 items-center">
      <AppText className="text-[16px] font-black text-foreground">{value}</AppText>
      <AppText className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </AppText>
    </AppView>
  );
}

function StopRow({ tone, title, subtitle }: { tone: string; title: string; subtitle: string }) {
  return (
    <AppView row className="items-start gap-3">
      <AppView className={`mt-1.5 h-3 w-3 rounded-full ${tone}`} />
      <AppView className="flex-1">
        <AppText className="text-[15px] font-bold text-foreground" numberOfLines={2}>
          {title}
        </AppText>
        <AppText className="mt-0.5 text-[12px] text-muted" numberOfLines={1}>
          {subtitle}
        </AppText>
      </AppView>
    </AppView>
  );
}

function OfferDetails({ offer }: { offer: JobOffer }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const secondsLeft = useCountdown(offer.expiresAt);
  const accept = useAcceptOffer();
  const reject = useRejectOffer();

  // The offer goes to the next driver when time runs out.
  useEffect(() => {
    if (secondsLeft === 0 && !accept.isPending) router.back();
  }, [secondsLeft, accept.isPending, router]);

  const handleAccept = () =>
    accept.mutate(offer.id, {
      onSuccess: () => router.replace('/active-delivery'),
      onError: (error) => {
        Alert.alert('Request unavailable', getErrorMessage(error));
        router.back();
      },
    });

  const handleDecline = () =>
    Alert.alert('Why are you declining?', undefined, [
      ...DECLINE_REASONS.map((reason) => ({
        text: reason,
        onPress: () => {
          reject.mutate({ offerId: offer.id, reason });
          router.back();
        },
      })),
      { text: 'Keep request', style: 'cancel' as const },
    ]);

  const isCash = offer.paymentMode === 'cash';

  return (
    <AppView className="flex-1 bg-[#FBFBFC] dark:bg-background">
      <FocusAwareStatusBar />

      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 8 }}
        className="rounded-b-[36px] bg-brand px-6 pb-6 shadow-md"
      >
        <AppView row className="items-center justify-between">
          <AppView>
            <AppText className="text-[24px] font-black tracking-tight text-white">
              New delivery request
            </AppText>
            <AppText className="text-[13px] font-semibold text-white/85">
              {offer.vehicle.name} · Order #{offer.orderNumber}
            </AppText>
          </AppView>
          <AppView
            accessibilityLabel={`${secondsLeft} seconds left to accept`}
            className="h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <AppText className="text-[22px] font-black text-brand">{secondsLeft}</AppText>
          </AppView>
        </AppView>
      </AppView>

      <AppScrollView
        contentContainerClassName="px-5 pb-12 pt-4 gap-4"
        showsVerticalScrollIndicator={false}
      >
        <AppView className="overflow-hidden rounded-[28px] border border-border/80 bg-card shadow-sm">
          <RouteMap
            pickup={offer.pickup.location}
            drop={offer.drop.location}
            className="h-48 w-full"
          />

          <AppView className="p-4">
            <AppView row className="items-end justify-between border-b border-border/40 pb-3">
              <AppView>
                <AppText className="text-[12px] font-semibold uppercase tracking-wider text-muted">
                  You earn
                </AppText>
                <AppText className="text-[32px] font-black leading-tight text-foreground">
                  {formatRupees(offer.driverEarning)}
                </AppText>
              </AppView>
              <AppView className="items-end">
                <AppView
                  className={`rounded-full px-3 py-1 ${isCash ? 'bg-amber-500/15' : 'bg-emerald-500/15'}`}
                >
                  <AppText
                    className={`text-[12px] font-bold ${
                      isCash
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {isCash ? 'Cash' : 'Paid online'}
                  </AppText>
                </AppView>
                <AppText className="mt-1 text-[12px] text-muted">
                  Fare {formatRupees(offer.fare)}
                </AppText>
              </AppView>
            </AppView>

            <AppView className="my-4 gap-3">
              <StopRow
                tone="bg-emerald-500"
                title={offer.pickup.label}
                subtitle={`Pickup · ${offer.pickup.houseNumber}`}
              />
              <StopRow
                tone="bg-brand"
                title={offer.drop.label}
                subtitle={`Drop · ${offer.drop.houseNumber}`}
              />
            </AppView>

            <AppView row className="rounded-2xl bg-surface-muted py-3">
              <Stat
                label="To pickup"
                value={
                  offer.pickupDistanceKm !== null ? formatDistance(offer.pickupDistanceKm) : '—'
                }
              />
              <Stat label="Trip" value={formatDistance(offer.tripDistanceKm)} />
              <Stat label="Est. time" value={formatMinutes(offer.estimatedMinutes)} />
            </AppView>

            {isCash ? (
              <AppView row className="mt-3 items-center gap-2 rounded-2xl bg-amber-500/10 p-3">
                <Icon name="banknote" size={16} color="#d97706" />
                <AppText className="flex-1 text-[12px] font-medium text-amber-800 dark:text-amber-300">
                  Collect {formatRupees(offer.fare)}{' '}
                  {offer.paymentTiming === 'on-pickup'
                    ? 'from the sender at pickup'
                    : 'from the receiver at drop'}
                </AppText>
              </AppView>
            ) : null}
          </AppView>
        </AppView>

        <AppView row className="gap-3 pt-1">
          <AppPressable
            onPress={handleDecline}
            disabled={accept.isPending}
            pressScale={0.96}
            className="flex-1 items-center justify-center rounded-full border border-border bg-card py-4 active:bg-neutral-100"
          >
            <AppText className="text-[15px] font-bold text-foreground">Decline</AppText>
          </AppPressable>
          <Button
            label="Accept trip"
            variant="brand"
            size="lg"
            loading={accept.isPending}
            onPress={handleAccept}
            className="flex-1"
            textClassName="font-extrabold text-[15px]"
          />
        </AppView>
      </AppScrollView>
    </AppView>
  );
}

export function IncomingJobScreen() {
  const router = useRouter();
  const { offerId } = useLocalSearchParams<{ offerId?: string }>();
  const offersQuery = useOffers(true);
  const offer = offersQuery.data?.find((o) => o.id === offerId) ?? offersQuery.data?.[0];

  if (!offer) {
    return (
      <AppView className="flex-1 items-center justify-center bg-background p-6">
        <Icon name="box.truck" size={48} tone="icon-subtle" />
        <AppText className="mt-3 text-[18px] font-bold text-foreground">
          {offersQuery.isLoading ? 'Loading request…' : 'This request is no longer available'}
        </AppText>
        <Button label="Back to home" onPress={() => router.back()} className="mt-6" />
      </AppView>
    );
  }

  return <OfferDetails key={offer.id} offer={offer} />;
}
