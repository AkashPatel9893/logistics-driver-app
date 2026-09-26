import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppPressable,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
  OlaMapCamera,
  OlaMapMarker,
  OlaMapView,
} from '@/components/ui';
import { useDriverStore } from '@/stores/driver-store';

export function ActiveDeliveryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const activeJob = useDriverStore((s) => s.activeJob);
  const updateJobStatus = useDriverStore((s) => s.updateJobStatus);

  if (!activeJob) {
    return (
      <AppView className="flex-1 items-center justify-center bg-background p-6">
        <Icon name="box.truck" size={48} tone="icon-subtle" />
        <AppText className="mt-3 text-[18px] font-bold text-foreground">
          No Active Delivery in Progress
        </AppText>
        <Button label="Go to Dashboard" onPress={() => router.replace('/home')} className="mt-6" />
      </AppView>
    );
  }

  const isHeadingPickup = activeJob.status === 'accepted' || activeJob.status === 'incoming';
  const isAtPickup = activeJob.status === 'arrived_pickup';
  const isPickupVerified = activeJob.status === 'pickup_verified';
  const isInTransit = activeJob.status === 'in_transit';
  const isAtDrop = activeJob.status === 'arrived_drop';

  const isTargetPickup = isHeadingPickup || isAtPickup;
  const currentTargetName = isTargetPickup ? activeJob.pickupName : activeJob.dropName;
  const currentTargetAddress = isTargetPickup ? activeJob.pickupAddress : activeJob.dropAddress;
  const contactName = isTargetPickup ? activeJob.customerName : activeJob.recipientName;
  const contactPhone = isTargetPickup ? activeJob.customerPhone : activeJob.recipientPhone;

  const handleCall = () => {
    Linking.openURL(`tel:${contactPhone}`);
  };

  const handleChat = () => {
    router.push('/customer-chat');
  };

  const handlePrimaryAction = () => {
    if (isHeadingPickup) {
      updateJobStatus('arrived_pickup');
      router.push('/pickup-verification');
    } else if (isAtPickup) {
      router.push('/pickup-verification');
    } else if (isPickupVerified) {
      updateJobStatus('in_transit');
    } else if (isInTransit) {
      updateJobStatus('arrived_drop');
      router.push('/drop-verification');
    } else if (isAtDrop) {
      router.push('/drop-verification');
    }
  };

  let actionButtonLabel = "I've arrived";
  if (isAtPickup) actionButtonLabel = 'Enter Pickup OTP & Photos';
  else if (isPickupVerified) actionButtonLabel = 'Start Trip to Drop Location →';
  else if (isInTransit) actionButtonLabel = "I've Arrived at Drop Location";
  else if (isAtDrop) actionButtonLabel = 'Verify Drop & Collect Payment';

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />

      <AppView className="flex-1">
        <OlaMapView style={{ flex: 1 }}>
          <OlaMapCamera
            centerCoordinate={isTargetPickup ? activeJob.pickupLocation : activeJob.dropLocation}
            zoomLevel={14.5}
          />
          <OlaMapMarker coordinate={activeJob.pickupLocation}>
            <AppView className="h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
          </OlaMapMarker>
          <OlaMapMarker coordinate={activeJob.dropLocation}>
            <AppView className="h-4 w-4 rounded-full border-2 border-white bg-brand shadow-sm" />
          </OlaMapMarker>
        </OlaMapView>
      </AppView>

      <AppView
        style={{ top: insets.top + 8 }}
        className="absolute left-4 right-4 z-20 overflow-hidden rounded-3xl border border-border bg-neutral-950/90 p-4 shadow-xl backdrop-blur-md"
      >
        <AppView row className="items-center justify-between">
          <LiquidGlassBackButton onPress={() => router.replace('/home')} />
          <AppView className="rounded-full bg-brand/20 px-3 py-1">
            <AppText className="text-[11px] font-black uppercase tracking-wider text-brand">
              {isTargetPickup ? 'STAGE: PICKUP' : 'STAGE: DROP'}
            </AppText>
          </AppView>
        </AppView>

        <AppView row className="mt-3 items-center gap-3.5">
          <AppView className="h-12 w-12 items-center justify-center rounded-2xl bg-brand">
            <Icon name="arrow.right" size={24} color="#ffffff" />
          </AppView>
          <AppView className="flex-1">
            <AppText className="text-[17px] font-black text-white" numberOfLines={1}>
              Turn left in 250m
            </AppText>
            <AppText className="text-[12px] font-medium text-neutral-300" numberOfLines={1}>
              onto {currentTargetName}
            </AppText>
          </AppView>
          <AppView className="items-end">
            <AppText className="text-[15px] font-black text-brand">8 mins</AppText>
            <AppText className="text-[11px] text-neutral-400">2.4 km</AppText>
          </AppView>
        </AppView>
      </AppView>

      <AppView style={{ bottom: 220 }} className="absolute right-4 z-20 gap-3">
        <AppPressable
          onPress={handleCall}
          pressScale={0.92}
          className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-xl border border-border/30 active:bg-neutral-100"
        >
          <Icon name="phone.fill" size={20} tone="brand" />
        </AppPressable>

        <AppPressable
          onPress={handleChat}
          pressScale={0.92}
          className="relative h-12 w-12 items-center justify-center rounded-full bg-white shadow-xl border border-border/30 active:bg-neutral-100"
        >
          <Icon name="message.fill" size={20} tone="brand" />
          <AppView className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white" />
        </AppPressable>
      </AppView>

      <AppView
        style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        className="rounded-t-3xl border-t border-border bg-card px-5 pt-5 shadow-2xl"
      >
        <AppView row className="items-center justify-between border-b border-border/60 pb-3">
          <AppView row className="items-center gap-3">
            <AppView className="h-10 w-10 items-center justify-center rounded-full bg-brand/10">
              <AppText className="text-[16px] font-black text-brand">
                {contactName.slice(0, 1)}
              </AppText>
            </AppView>
            <AppView>
              <AppText className="text-[15px] font-extrabold text-foreground">
                {contactName}
              </AppText>
              <AppText className="text-[12px] text-muted">
                {isTargetPickup ? 'Sender' : 'Receiver'} • ★ 4.9
              </AppText>
            </AppView>
          </AppView>

          <AppView className="items-end">
            <AppText className="text-[18px] font-black text-brand">₹{activeJob.fare}</AppText>
            <AppText className="text-[11px] font-semibold text-foreground-secondary">
              {activeJob.paymentMode}
            </AppText>
          </AppView>
        </AppView>

        <AppView className="my-3.5">
          <AppText className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Destination Address
          </AppText>
          <AppText className="mt-0.5 text-[15px] font-bold text-foreground" numberOfLines={1}>
            {currentTargetName}
          </AppText>
          <AppText className="mt-0.5 text-[12px] text-muted" numberOfLines={2}>
            {currentTargetAddress}
          </AppText>
        </AppView>

        <Button
          label={actionButtonLabel}
          onPress={handlePrimaryAction}
          variant="brand"
          size="lg"
          textClassName="font-extrabold text-base"
        />
      </AppView>
    </AppView>
  );
}
