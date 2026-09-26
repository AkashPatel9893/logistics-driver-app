import { AppText, AppView, Icon } from '@/components/ui';
import type { TripSummary } from '@/lib/api/models';
import { formatDayTime, formatDistance, formatRupees } from '@/lib/format';

export interface DriverPastTripCardProps {
  trip: TripSummary;
  className?: string;
}

export function DriverPastTripCard({ trip, className = '' }: DriverPastTripCardProps) {
  const isCancelled = trip.status === 'cancelled';

  return (
    <AppView
      className={`overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm ${className}`}
    >
      <AppView row className="items-center justify-between border-b border-border/60 pb-3">
        <AppView row className="items-center gap-2">
          <AppView className="h-8 w-8 items-center justify-center rounded-xl bg-brand/10">
            <Icon name="box.truck.fill" size={16} tone="brand" />
          </AppView>
          <AppView>
            <AppText className="text-[12px] font-semibold text-muted">
              {formatDayTime(trip.endedAt)}
            </AppText>
            <AppText className="text-[11px] font-medium text-foreground-secondary">
              #{trip.number} · {trip.vehicle.name} · {formatDistance(trip.tripDistanceKm)}
            </AppText>
          </AppView>
        </AppView>

        <AppView className="items-end">
          <AppText className="text-[17px] font-black text-foreground">
            {formatRupees(trip.driverEarning)}
          </AppText>
          <AppView
            className={`rounded-full px-2 py-0.5 ${isCancelled ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}
          >
            <AppText
              className={`text-[10px] font-bold ${
                isCancelled
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {isCancelled
                ? 'Cancelled'
                : trip.paymentMode === 'cash'
                  ? 'Delivered · Cash'
                  : 'Delivered'}
            </AppText>
          </AppView>
        </AppView>
      </AppView>

      <AppView className="mt-3 gap-2">
        <AppView row className="items-start gap-2.5">
          <AppView className="mt-1 h-2.5 w-2.5 rounded-full border border-emerald-500 bg-white" />
          <AppText className="flex-1 text-[13px] font-medium text-foreground" numberOfLines={1}>
            {trip.pickupLabel}
          </AppText>
        </AppView>
        <AppView row className="items-start gap-2.5">
          <AppView className="mt-1 h-2.5 w-2.5 rounded-full bg-brand" />
          <AppText className="flex-1 text-[13px] font-medium text-foreground" numberOfLines={1}>
            {trip.dropLabel}
          </AppText>
        </AppView>
      </AppView>
    </AppView>
  );
}
