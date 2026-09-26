import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppPressable,
  AppSpinner,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
  OptionSheet,
} from '@/components/ui';
import { useActiveJob, useArriveAtDrop, useArriveAtPickup, useCancelJob } from '@/hooks/use-jobs';
import { getErrorMessage } from '@/lib/api/api-error';
import type { DriverJob } from '@/lib/api/models';
import { formatDistance, formatMinutes, formatRupees } from '@/lib/format';
import { distanceKm } from '@/lib/geo';
import { openNavigationChooser } from '@/lib/navigation-apps';
import { useLocationStore } from '@/stores/location-store';

import { RouteMap } from '../components/route-map';
import { currentStop, JOB_STAGE_LABEL } from '../job-stage';

// Road distance is ~1.3× straight-line in Indian cities; speed is a city average.
const ROAD_FACTOR = 1.3;
const CITY_SPEED_KMPH = 22;
/** Beyond this, "I've arrived" asks for confirmation. */
const ARRIVAL_RADIUS_KM = 0.5;
const CANCEL_REASONS = [
  'Customer not reachable',
  'Parcel not ready',
  'Parcel too large for my vehicle',
  'Vehicle breakdown',
];

function useLeg(job: DriverJob) {
  const current = useLocationStore((s) => s.current);
  const stop = currentStop(job.status);
  const target = stop === 'pickup' ? job.pickup : job.drop;
  const straightKm = current && target.location ? distanceKm(current, target.location) : null;
  const roadKm = straightKm !== null ? straightKm * ROAD_FACTOR : null;
  return {
    stop,
    target,
    driver: current,
    straightKm,
    roadKm,
    etaMinutes: roadKm !== null ? (roadKm / CITY_SPEED_KMPH) * 60 : null,
  };
}

function ActiveDelivery({ job }: { job: DriverJob }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const leg = useLeg(job);
  const arriveAtPickup = useArriveAtPickup();
  const arriveAtDrop = useArriveAtDrop();
  const cancelJob = useCancelJob();
  const [cancelSheetOpen, setCancelSheetOpen] = useState(false);

  const isPickup = leg.stop === 'pickup';
  const contact = isPickup ? job.sender : (job.drop.contact ?? job.sender);
  const hasArrived = job.status === 'arrived_at_pickup' || job.status === 'arrived_at_drop';
  const busy = arriveAtPickup.isPending || arriveAtDrop.isPending;

  const markArrived = () => {
    const mutation = isPickup ? arriveAtPickup : arriveAtDrop;
    mutation.mutate(job.id, {
      onSuccess: () => router.push(isPickup ? '/pickup-verification' : '/drop-verification'),
      onError: (error) => Alert.alert('Could not update trip', getErrorMessage(error)),
    });
  };

  const handlePrimary = () => {
    if (hasArrived) {
      router.push(isPickup ? '/pickup-verification' : '/drop-verification');
      return;
    }
    if (leg.straightKm !== null && leg.straightKm > ARRIVAL_RADIUS_KM) {
      Alert.alert(
        'Not at the location yet?',
        `You are about ${formatDistance(leg.straightKm)} from the ${isPickup ? 'pickup' : 'drop'} point. Mark as arrived anyway?`,
        [
          { text: 'Keep driving', style: 'cancel' },
          { text: "I've arrived", onPress: markArrived },
        ],
      );
      return;
    }
    markArrived();
  };

  // mutateAsync: the cache update unmounts this view, which would drop mutate() callbacks.
  const cancelWithReason = async (reason: string) => {
    try {
      await cancelJob.mutateAsync({ id: job.id, reason });
      router.replace('/home');
    } catch (error) {
      Alert.alert('Could not cancel', getErrorMessage(error));
    }
  };

  const primaryLabel = hasArrived
    ? isPickup
      ? 'Verify pickup'
      : 'Verify delivery'
    : isPickup
      ? "I've arrived at pickup"
      : "I've arrived at drop";

  const payment = job.payment;
  const paymentNote =
    payment.mode === 'prepaid'
      ? `Paid online · ${payment.methodLabel}`
      : payment.status === 'collected'
        ? `Collected via ${payment.collectedVia === 'upi' ? 'UPI' : 'cash'}`
        : `Collect cash ${payment.timing === 'on-pickup' ? 'at pickup' : 'at drop'}`;

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />

      <RouteMap
        pickup={job.pickup.location}
        drop={job.drop.location}
        driver={leg.driver}
        focus={leg.stop}
        padding={{ top: insets.top + 170, right: 60, bottom: 60, left: 60 }}
      />

      <AppView
        style={{ top: insets.top + 8 }}
        className="absolute left-4 right-4 z-20 overflow-hidden rounded-3xl border border-border bg-neutral-950/90 p-4 shadow-xl"
      >
        <AppView row className="items-center justify-between">
          <LiquidGlassBackButton onPress={() => router.replace('/home')} />
          <AppView className="rounded-full bg-brand px-3 py-1">
            <AppText className="text-[11px] font-black uppercase tracking-wider text-white">
              {JOB_STAGE_LABEL[job.status]}
            </AppText>
          </AppView>
        </AppView>

        <AppView row className="mt-3 items-center gap-3">
          <AppView className="flex-1">
            <AppText className="text-[12px] font-bold uppercase tracking-wider text-neutral-400">
              {hasArrived ? "You've arrived" : isPickup ? 'Next: pickup' : 'Next: drop'}
            </AppText>
            <AppText className="mt-0.5 text-[17px] font-black text-white" numberOfLines={1}>
              {leg.target.label.split(',')[0]}
            </AppText>
            <AppText className="text-[12px] font-medium text-neutral-300" numberOfLines={1}>
              {hasArrived
                ? `Waiting for ${contact.name.split(' ')[0]}`
                : leg.roadKm !== null && leg.etaMinutes !== null
                  ? `${formatDistance(leg.roadKm)} · about ${formatMinutes(leg.etaMinutes)}`
                  : leg.target.houseNumber}
            </AppText>
          </AppView>
          {!hasArrived && leg.target.location ? (
            <AppPressable
              onPress={() =>
                leg.target.location && openNavigationChooser(leg.target.location, leg.target.label)
              }
              pressScale={0.95}
              accessibilityLabel="Navigate with a maps app"
              className="flex-row items-center gap-2 rounded-full bg-brand px-4 py-3"
            >
              <Icon name="location.north.fill" size={16} color="#ffffff" />
              <AppText className="text-[14px] font-black text-white">Navigate</AppText>
            </AppPressable>
          ) : null}
        </AppView>
      </AppView>

      <AppView
        style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        className="rounded-t-3xl border-t border-border bg-card px-5 pt-5 shadow-2xl"
      >
        <AppView row className="items-center justify-between border-b border-border/60 pb-3">
          <AppView row className="flex-1 items-center gap-3">
            <AppView className="h-10 w-10 items-center justify-center rounded-full bg-brand/10">
              <AppText className="text-[16px] font-black text-brand">
                {contact.name.slice(0, 1)}
              </AppText>
            </AppView>
            <AppView className="flex-1">
              <AppText className="text-[15px] font-extrabold text-foreground" numberOfLines={1}>
                {contact.name}
              </AppText>
              <AppText className="text-[12px] text-muted">
                {isPickup ? 'Sender' : 'Receiver'} · #{job.number}
              </AppText>
            </AppView>
          </AppView>

          <AppView row className="gap-2">
            <AppPressable
              onPress={() => Linking.openURL(`tel:${contact.phone}`)}
              accessibilityLabel={`Call ${contact.name}`}
              pressScale={0.92}
              className="h-11 w-11 items-center justify-center rounded-full border border-border bg-background"
            >
              <Icon name="phone.fill" size={18} tone="brand" />
            </AppPressable>
            <AppPressable
              onPress={() => router.push('/customer-chat')}
              accessibilityLabel={`Chat with ${job.sender.name}${job.unreadMessages ? `, ${job.unreadMessages} unread` : ''}`}
              pressScale={0.92}
              className="relative h-11 w-11 items-center justify-center rounded-full border border-border bg-background"
            >
              <Icon name="message.fill" size={18} tone="brand" />
              {job.unreadMessages > 0 ? (
                <AppView className="absolute -right-0.5 -top-0.5 h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1">
                  <AppText className="text-[10px] font-black text-white">
                    {job.unreadMessages}
                  </AppText>
                </AppView>
              ) : null}
            </AppPressable>
          </AppView>
        </AppView>

        <AppView className="my-3.5 gap-1">
          <AppText className="text-[11px] font-bold uppercase tracking-wider text-muted">
            {isPickup ? 'Pickup address' : 'Drop address'}
          </AppText>
          <AppText className="text-[15px] font-bold text-foreground" numberOfLines={2}>
            {leg.target.label}
          </AppText>
          <AppText className="text-[12px] text-muted">{leg.target.houseNumber}</AppText>
        </AppView>

        <AppView row className="mb-4 items-center justify-between rounded-2xl bg-surface-muted p-3">
          <AppText className="text-[13px] font-semibold text-foreground-secondary">
            {paymentNote}
          </AppText>
          <AppText className="text-[16px] font-black text-foreground">
            {formatRupees(job.driverEarning)}
          </AppText>
        </AppView>

        <Button
          label={primaryLabel}
          onPress={handlePrimary}
          loading={busy}
          variant="brand"
          size="lg"
          textClassName="font-extrabold text-base"
        />
        {isPickup ? (
          <AppPressable
            onPress={() => setCancelSheetOpen(true)}
            className="mt-3 items-center py-1 active:opacity-70"
          >
            <AppText className="text-[13px] font-semibold text-muted">Cancel trip</AppText>
          </AppPressable>
        ) : null}
      </AppView>

      <OptionSheet
        isPresented={cancelSheetOpen}
        title="Cancel this trip?"
        message="Choose a reason. Frequent cancellations lower your priority."
        options={CANCEL_REASONS}
        cancelLabel="Keep trip"
        destructive
        onSelect={cancelWithReason}
        onDismiss={() => setCancelSheetOpen(false)}
      />
    </AppView>
  );
}

export function ActiveDeliveryScreen() {
  const router = useRouter();
  const { data: job, isLoading } = useActiveJob();

  if (!job) {
    return (
      <AppView className="flex-1 items-center justify-center bg-background p-6">
        {isLoading ? (
          <AppSpinner size="large" />
        ) : (
          <>
            <Icon name="box.truck" size={48} tone="icon-subtle" />
            <AppText className="mt-3 text-[18px] font-bold text-foreground">
              No trip in progress
            </AppText>
            <Button label="Go to home" onPress={() => router.replace('/home')} className="mt-6" />
          </>
        )}
      </AppView>
    );
  }

  return <ActiveDelivery job={job} />;
}
