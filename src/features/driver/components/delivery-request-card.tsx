import { AppPressable, AppText, AppView } from '@/components/ui';
import type { JobRequest } from '@/stores/driver-store';

export interface DeliveryRequestCardProps {
  job: JobRequest;
  onAccept: (job: JobRequest) => void;
  onDecline: (jobId: string) => void;
  countdownSeconds?: number;
  className?: string;
}

export function DeliveryRequestCard({
  job,
  onAccept,
  onDecline,
  countdownSeconds,
  className = '',
}: DeliveryRequestCardProps) {
  return (
    <AppView
      className={`overflow-hidden rounded-[26px] border border-border/80 bg-card p-4.5 shadow-sm ${className}`}
    >
      {/* Top Header */}
      <AppView row className="items-center justify-between pb-3 border-b border-border/40">
        <AppText className="text-[16px] font-extrabold text-foreground">
          {job.vehicleType.toLowerCase().includes('delivery')
            ? job.vehicleType
            : `${job.vehicleType} · Delivery`}
        </AppText>
        <AppText className="text-[22px] font-black text-foreground">₹{job.fare}</AppText>
      </AppView>

      {/* Locations */}
      <AppView className="my-3.5 gap-2.5">
        {/* Pickup */}
        <AppView row className="items-center gap-3">
          <AppView className="h-3 w-3 rounded-full bg-emerald-500" />
          <AppText className="flex-1 text-[14px] font-bold text-foreground" numberOfLines={1}>
            {job.pickupName}, {job.pickupAddress}
          </AppText>
        </AppView>

        {/* Drop */}
        <AppView row className="items-center gap-3">
          <AppView className="h-3 w-3 rounded-full bg-brand" />
          <AppText className="flex-1 text-[14px] font-bold text-foreground" numberOfLines={1}>
            {job.dropName}, {job.dropAddress}
          </AppText>
        </AppView>
      </AppView>

      {/* Summary Row */}
      <AppView row className="items-center justify-between pb-4 pt-1">
        <AppText className="text-[13px] font-medium text-muted">{job.distanceKm} km</AppText>
        <AppText className="text-[13px] font-medium text-muted">{job.durationMin} min</AppText>
        <AppText className="text-[13px] font-medium text-muted">
          {job.paymentMode === 'Cash' ? 'Cash on Delivery' : 'Prepaid'}
        </AppText>
      </AppView>

      {/* Actions */}
      <AppView row className="gap-3">
        <AppPressable
          onPress={() => onDecline(job.id)}
          pressScale={0.96}
          className="flex-1 items-center justify-center rounded-2xl border border-border bg-card py-3.5 active:bg-neutral-100 dark:active:bg-neutral-800"
        >
          <AppText className="text-[15px] font-bold text-foreground">Decline</AppText>
        </AppPressable>

        <AppPressable
          onPress={() => onAccept(job)}
          pressScale={0.96}
          className="flex-1 items-center justify-center rounded-2xl bg-brand py-3.5 shadow-sm active:opacity-90"
        >
          <AppText className="text-[15px] font-bold text-white">
            {countdownSeconds !== undefined && countdownSeconds > 0
              ? `Accept (${countdownSeconds}s)`
              : 'Accept job'}
          </AppText>
        </AppPressable>
      </AppView>
    </AppView>
  );
}
