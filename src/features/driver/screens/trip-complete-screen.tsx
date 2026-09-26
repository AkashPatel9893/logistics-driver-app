import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppImage,
  AppPressable,
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  FocusAwareStatusBar,
  Icon,
} from '@/components/ui';
import { useDriverProfile } from '@/hooks/use-driver';
import { useJob } from '@/hooks/use-jobs';
import type { DriverJob } from '@/lib/api/models';
import { formatDayTime, formatDistance, formatMinutes, formatRupees } from '@/lib/format';

function paymentLine(job: DriverJob): string {
  const { payment } = job;
  if (payment.mode === 'prepaid') return `Paid online by customer · ${payment.methodLabel}`;
  if (payment.collectedVia === 'upi') return `Collected ${formatRupees(payment.amount)} via UPI`;
  return `Cash collected ${formatRupees(payment.amount)} · ${formatRupees(job.commission)} commission from wallet`;
}

export function TripCompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: job } = useJob(id);
  const { data: profile } = useDriverProfile();

  if (!job) {
    return (
      <AppView className="flex-1 items-center justify-center bg-background">
        <AppSpinner size="large" />
      </AppView>
    );
  }

  const tripMinutes =
    job.deliveredAt && job.acceptedAt
      ? (Date.parse(job.deliveredAt) - Date.parse(job.acceptedAt)) / 60_000
      : null;
  const firstName = profile?.name.split(' ')[0];

  return (
    <AppView className="flex-1 bg-[#FBFBFC] dark:bg-background">
      <FocusAwareStatusBar />

      <AppView style={{ paddingTop: Math.max(insets.top, 12) + 4 }} className="px-6 pb-2">
        <AppText className="text-[28px] font-black tracking-tight text-foreground">
          Delivery complete
        </AppText>
        <AppText className="text-[15px] font-medium text-muted">
          Order #{job.number}
          {job.deliveredAt ? ` · ${formatDayTime(job.deliveredAt)}` : ''}
        </AppText>
      </AppView>

      <AppScrollView
        contentContainerClassName="items-center px-6 pb-12 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <AppView className="h-24 w-24 items-center justify-center rounded-full bg-[#E8F8EE] dark:bg-emerald-950/40">
          <Icon name="checkmark" size={36} color="#16a34a" weight="bold" />
        </AppView>

        <AppText className="mt-4 text-center text-[24px] font-black text-foreground">
          Great work{firstName ? `, ${firstName}` : ''}!
        </AppText>
        <AppText className="mt-1 text-center text-[15px] font-medium text-muted">
          The parcel was delivered to {job.drop.contact?.name ?? 'the receiver'}.
        </AppText>

        <AppView className="mt-6 w-full gap-4 rounded-[28px] border border-border/80 bg-card p-5 shadow-sm">
          {[
            { label: 'PICKUP', tone: 'bg-emerald-500', stop: job.pickup },
            { label: 'DROP-OFF', tone: 'bg-brand', stop: job.drop },
          ].map(({ label, tone, stop }) => (
            <AppView key={label}>
              <AppView row className="items-center gap-2">
                <AppView className={`h-2.5 w-2.5 rounded-full ${tone}`} />
                <AppText className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  {label}
                </AppText>
              </AppView>
              <AppText className="mt-1 text-[16px] font-bold text-foreground">{stop.label}</AppText>
            </AppView>
          ))}

          <AppView row className="gap-3 pt-1">
            <AppView className="flex-1 rounded-2xl border border-border/60 bg-[#F9F9FB] p-4 dark:bg-card/60">
              <AppText className="text-[12px] font-bold uppercase text-muted">DISTANCE</AppText>
              <AppText className="mt-1 text-[22px] font-black text-foreground">
                {formatDistance(job.tripDistanceKm)}
              </AppText>
            </AppView>
            <AppView className="flex-1 rounded-2xl border border-border/60 bg-[#F9F9FB] p-4 dark:bg-card/60">
              <AppText className="text-[12px] font-bold uppercase text-muted">TIME</AppText>
              <AppText className="mt-1 text-[22px] font-black text-foreground">
                {tripMinutes !== null ? formatMinutes(tripMinutes) : '—'}
              </AppText>
            </AppView>
          </AppView>

          {job.dropPhotoUrl ? (
            <AppView>
              <AppText className="mb-2 text-[12px] font-bold uppercase text-muted">
                Proof of delivery
              </AppText>
              <AppImage
                source={{ uri: job.dropPhotoUrl }}
                contentFit="cover"
                className="h-36 w-full rounded-2xl"
                accessibilityLabel="Delivery photo"
              />
            </AppView>
          ) : null}

          <AppView className="border-t border-border/60 pt-2">
            <AppText className="text-[14px] font-medium text-muted">Your earnings</AppText>
            <AppText className="text-[38px] font-black leading-tight text-brand">
              {formatRupees(job.driverEarning)}
            </AppText>
            <AppText className="mt-1 text-[14px] text-muted">{paymentLine(job)}</AppText>
          </AppView>
        </AppView>

        <AppView className="mt-7 w-full gap-3">
          <AppPressable
            onPress={() => router.replace('/home')}
            pressScale={0.97}
            className="items-center justify-center rounded-full bg-[#18181B] py-4 shadow-md active:opacity-90 dark:bg-white"
          >
            <AppText className="text-[16px] font-black text-white dark:text-black">
              Back to home
            </AppText>
          </AppPressable>
          <AppPressable
            onPress={() => router.push('/earnings')}
            pressScale={0.97}
            className="items-center justify-center rounded-full border border-border/80 bg-card py-4 shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800"
          >
            <AppText className="text-[16px] font-black text-foreground">View earnings</AppText>
          </AppPressable>
        </AppView>
      </AppScrollView>
    </AppView>
  );
}
