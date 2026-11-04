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
import { formatDistance, formatEarning, formatRupees } from '@/lib/format';
import { distanceKm } from '@/lib/geo';
import { openGoogleMapsDirections } from '@/lib/navigation-apps';
import { useLocationStore } from '@/stores/location-store';

import { RouteMap } from '../components/route-map';
import { currentStop } from '../job-stage';

/** Beyond this, "I've arrived" asks for confirmation. */
// Matches the backend's arrival_geofence_meters, which refuses an arrival from further away.
const ARRIVAL_RADIUS_KM = 0.2;
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
  return { stop, target, driver: current, straightKm };
}

/** Everything the sender gave for this stop, so the driver can find the door without calling. */
function addressLines(job: DriverJob, stop: 'pickup' | 'drop', label: string, houseNumber: string) {
  const stops = job.stops ?? [];
  const match =
    stop === 'pickup'
      ? stops.find((s) => s.stopType === 'PICKUP')
      : (stops.find((s) => s.stopId === job.currentStopId) ??
        [...stops].reverse().find((s) => s.stopType === 'DROP'));
  // The backend appends the city to a line that may already end with it ("Koramangala, Bengaluru, Bengaluru").
  const dedupe = (text: string) =>
    text
      .split(', ')
      .filter((part, i, parts) => part !== parts[i - 1])
      .join(', ');
  return [
    houseNumber,
    dedupe(match?.addressLine1 ?? label),
    match?.addressLine2,
    match?.landmark ? `Landmark: ${match.landmark}` : null,
  ].filter((line, i, all): line is string => Boolean(line) && all.indexOf(line) === i);
}

/** Pending delivery stops before the final one, for the map. */
function viaStops(job: DriverJob) {
  const drops = (job.stops ?? []).filter((s) => s.stopType === 'DROP');
  return drops
    .slice(0, -1)
    .filter((s) => s.status !== 'COMPLETED' && s.stopId !== job.currentStopId && s.location)
    .map((s) => ({
      latitude: Number(s.location?.latitude),
      longitude: Number(s.location?.longitude),
    }));
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
  const hasArrived =
    job.status === 'arrived_at_pickup' ||
    job.status === 'arrived_at_drop' ||
    job.status === 'awaiting_payment';
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
        'Not at the location yet',
        `You are about ${formatDistance(leg.straightKm)} from the ${isPickup ? 'pickup' : 'drop'} point. Get within ${ARRIVAL_RADIUS_KM * 1000} m to mark arrival. If you are already there, contact support.`,
        [
          { text: 'Get help', onPress: () => router.push('/support') },
          { text: 'Keep driving', style: 'cancel' },
        ],
      );
      return;
    }
    markArrived();
  };

  // Cancellation is only allowed BEFORE pickup has occurred. Once picked up, the driver must complete the delivery.
  const canCancel =
    !job.pickedUpAt &&
    isPickup &&
    (job.status === 'heading_to_pickup' || job.status === 'arrived_at_pickup');

  // mutateAsync: the cache update unmounts this view, which would drop mutate() callbacks.
  const cancelWithReason = async (reason: string) => {
    if (!canCancel) {
      Alert.alert(
        'Cannot cancel order',
        'Goods have already been picked up. Mid-ride cancellations are not permitted. Please complete the delivery.',
      );
      return;
    }
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
      : job.status === 'awaiting_payment'
        ? 'Collect payment'
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
        via={viaStops(job)}
        driver={leg.driver}
        focus={leg.stop}
        padding={{ top: insets.top + 70, right: 60, bottom: 60, left: 60 }}
      />

      <AppView
        row
        style={{ top: insets.top + 8 }}
        className="absolute left-4 right-4 z-20 items-center justify-between"
      >
        <LiquidGlassBackButton onPress={() => router.replace('/home')} />
        {!hasArrived && leg.target.location ? (
          <AppPressable
            onPress={() =>
              leg.target.location && openGoogleMapsDirections(leg.target.location, leg.target.label)
            }
            pressScale={0.95}
            accessibilityLabel="Open directions in Google Maps"
            className="flex-row items-center gap-2 rounded-full bg-brand px-4 py-3 shadow-lg"
          >
            <Icon name="location.north.fill" size={16} color="#ffffff" />
            <AppText className="text-[14px] font-black text-white">Navigate</AppText>
          </AppPressable>
        ) : null}
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
                {/* No receiver details for this stop yet: the contact shown is the sender. */}
                {isPickup || !job.drop.contact ? 'Sender' : 'Receiver'} · #{job.number}
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
          {addressLines(job, leg.stop, leg.target.label, leg.target.houseNumber).map((line, i) => (
            <AppText
              key={line}
              className={
                i === 0 ? 'text-[15px] font-bold text-foreground' : 'text-[13px] text-muted'
              }
            >
              {line}
            </AppText>
          ))}
        </AppView>

        <AppView row className="mb-4 items-center justify-between rounded-2xl bg-surface-muted p-3">
          <AppText className="text-[13px] font-semibold text-foreground-secondary">
            {paymentNote}
          </AppText>
          <AppText className="text-[16px] font-black text-foreground">
            {payment.mode === 'cash' && payment.status !== 'collected'
              ? formatRupees(payment.amount)
              : formatEarning(job.driverEarning, job.fare)}
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
        {canCancel ? (
          <AppPressable onPress={() => setCancelSheetOpen(true)} className="mt-3 items-center py-1">
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
