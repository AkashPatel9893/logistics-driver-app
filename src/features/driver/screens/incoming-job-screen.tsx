import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  Icon,
  OlaMapCamera,
  OlaMapMarker,
  OlaMapView,
} from '@/components/ui';

import { useDriverStore } from '@/stores/driver-store';

export function IncomingJobScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const availableRequests = useDriverStore((s) => s.availableRequests);
  const acceptJob = useDriverStore((s) => s.acceptJob);
  const declineJob = useDriverStore((s) => s.declineJob);

  const currentJob = availableRequests[0];
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    if (countdown <= 0) {
      if (currentJob) declineJob(currentJob.id);
      router.back();
      return;
    }
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown, currentJob, declineJob, router]);

  if (!currentJob) {
    return (
      <AppView className="flex-1 items-center justify-center bg-background p-6">
        <Icon name="box.truck" size={48} tone="icon-subtle" />
        <AppText className="mt-3 text-[18px] font-bold text-foreground">
          No Pending Job Requests
        </AppText>
        <Button
          label="Back to Dashboard"
          onPress={() => router.replace('/home')}
          className="mt-6"
        />
      </AppView>
    );
  }

  const handleAccept = () => {
    acceptJob(currentJob);
    router.replace('/active-delivery');
  };

  const handleDecline = () => {
    declineJob(currentJob.id);
    router.back();
  };

  return (
    <AppView className="flex-1 bg-[#FBFBFC] dark:bg-background">
      <FocusAwareStatusBar />

      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 8 }}
        className="bg-brand px-6 pb-6 rounded-b-[36px] shadow-md"
      >
        <AppView row className="items-center justify-between">
          <AppText className="text-[24px] font-black tracking-tight text-white">
            New delivery request
          </AppText>
          <AppView className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            <AppText className="text-[20px] font-black text-brand">{countdown}</AppText>
          </AppView>
        </AppView>
      </AppView>

      <AppScrollView
        contentContainerClassName="px-5 pb-12 pt-4 gap-5"
        showsVerticalScrollIndicator={false}
      >
        <AppView className="overflow-hidden rounded-[28px] border border-border/80 bg-card p-4 shadow-sm">
          <AppView className="mb-4 h-44 w-full overflow-hidden rounded-2xl border border-border/50">
            <OlaMapView style={{ flex: 1 }}>
              <OlaMapCamera
                centerCoordinate={{
                  latitude:
                    (currentJob.pickupLocation.latitude + currentJob.dropLocation.latitude) / 2,
                  longitude:
                    (currentJob.pickupLocation.longitude + currentJob.dropLocation.longitude) / 2,
                }}
                zoomLevel={12}
              />
              <OlaMapMarker coordinate={currentJob.pickupLocation}>
                <AppView className="h-4 w-4 rounded-full border-2 border-white bg-black shadow-sm" />
              </OlaMapMarker>
              <OlaMapMarker coordinate={currentJob.dropLocation}>
                <AppView className="h-4 w-4 rounded-full border-2 border-white bg-brand shadow-sm" />
              </OlaMapMarker>
            </OlaMapView>
          </AppView>

          <AppView row className="items-center justify-between pb-2 border-b border-border/40">
            <AppText className="text-[16px] font-extrabold text-foreground">
              {currentJob.vehicleType} · Delivery
            </AppText>
            <AppText className="text-[24px] font-black text-foreground">₹{currentJob.fare}</AppText>
          </AppView>

          <AppView className="my-3 gap-2.5">
            <AppView row className="items-center gap-2.5">
              <AppView className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <AppText className="flex-1 text-[14px] font-bold text-foreground" numberOfLines={1}>
                {currentJob.pickupName}, {currentJob.pickupAddress}
              </AppText>
            </AppView>

            <AppView row className="items-center gap-2.5">
              <AppView className="h-2.5 w-2.5 rounded-full bg-brand" />
              <AppText className="flex-1 text-[14px] font-bold text-foreground" numberOfLines={1}>
                {currentJob.dropName}, {currentJob.dropAddress}
              </AppText>
            </AppView>
          </AppView>

          <AppView row className="items-center justify-between pb-4 pt-1">
            <AppText className="text-[13px] font-medium text-muted">
              {currentJob.distanceKm} km
            </AppText>
            <AppText className="text-[13px] font-medium text-muted">
              {currentJob.durationMin} min
            </AppText>
            <AppText className="text-[13px] font-medium text-muted">
              {currentJob.paymentMode === 'Cash' ? 'Cash' : 'Prepaid'}
            </AppText>
          </AppView>

          <AppView row className="gap-3">
            <AppPressable
              onPress={handleDecline}
              pressScale={0.96}
              className="flex-1 items-center justify-center rounded-full border border-border bg-card py-3.5 active:bg-neutral-100"
            >
              <AppText className="text-[15px] font-bold text-foreground">Decline</AppText>
            </AppPressable>

            <AppPressable
              onPress={handleAccept}
              pressScale={0.96}
              className="flex-1 items-center justify-center rounded-full bg-brand py-3.5 shadow-md shadow-brand/25 active:bg-brand/90"
            >
              <AppText className="text-[15px] font-bold text-white">Accept job</AppText>
            </AppPressable>
          </AppView>
        </AppView>

        {/* Other Nearby Jobs Section */}
        {availableRequests.length > 1 ? (
          <AppView className="gap-3 pt-2">
            <AppText className="text-[20px] font-black tracking-tight text-foreground">
              Other nearby jobs
            </AppText>
            {availableRequests.slice(1).map((job) => (
              <AppView
                key={job.id}
                className="rounded-[28px] border border-border/80 bg-card p-4 shadow-sm"
              >
                <AppView
                  row
                  className="items-center justify-between pb-2 border-b border-border/40"
                >
                  <AppText className="text-[16px] font-extrabold text-foreground">
                    {job.vehicleType} · Delivery
                  </AppText>
                  <AppText className="text-[24px] font-black text-foreground">₹{job.fare}</AppText>
                </AppView>

                <AppView className="my-3 gap-2.5">
                  <AppView row className="items-center gap-2.5">
                    <AppView className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <AppText
                      className="flex-1 text-[14px] font-bold text-foreground"
                      numberOfLines={1}
                    >
                      {job.pickupName}, {job.pickupAddress}
                    </AppText>
                  </AppView>

                  <AppView row className="items-center gap-2.5">
                    <AppView className="h-2.5 w-2.5 rounded-full bg-brand" />
                    <AppText
                      className="flex-1 text-[14px] font-bold text-foreground"
                      numberOfLines={1}
                    >
                      {job.dropName}, {job.dropAddress}
                    </AppText>
                  </AppView>
                </AppView>

                <AppView row className="items-center justify-between pb-4 pt-1">
                  <AppText className="text-[13px] font-medium text-muted">
                    {job.distanceKm} km
                  </AppText>
                  <AppText className="text-[13px] font-medium text-muted">
                    {job.durationMin} min
                  </AppText>
                  <AppText className="text-[13px] font-medium text-muted">
                    {job.paymentMode === 'Cash' ? 'Cash' : 'Prepaid'}
                  </AppText>
                </AppView>

                <AppView row className="gap-3">
                  <AppPressable
                    onPress={() => declineJob(job.id)}
                    pressScale={0.96}
                    className="flex-1 items-center justify-center rounded-full border border-border bg-card py-3.5 active:bg-neutral-100"
                  >
                    <AppText className="text-[15px] font-bold text-foreground">Decline</AppText>
                  </AppPressable>

                  <AppPressable
                    onPress={() => {
                      acceptJob(job);
                      router.replace('/active-delivery');
                    }}
                    pressScale={0.96}
                    className="flex-1 items-center justify-center rounded-full bg-brand py-3.5 shadow-md shadow-brand/25 active:bg-brand/90"
                  >
                    <AppText className="text-[15px] font-bold text-white">Accept job</AppText>
                  </AppPressable>
                </AppView>
              </AppView>
            ))}
          </AppView>
        ) : null}
      </AppScrollView>
    </AppView>
  );
}
