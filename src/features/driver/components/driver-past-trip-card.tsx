import { AppText, AppView, Icon } from '@/components/ui';
import type { PastTrip } from '@/stores/driver-store';

export interface DriverPastTripCardProps {
  trip: PastTrip;
  className?: string;
}

export function DriverPastTripCard({ trip, className = '' }: DriverPastTripCardProps) {
  return (
    <AppView
      className={`overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm ${className}`}
    >
      {/* Top Header: Date and Fare */}
      <AppView row className="items-center justify-between border-b border-border/60 pb-3">
        <AppView row className="items-center gap-2">
          <AppView className="h-8 w-8 items-center justify-center rounded-xl bg-brand/10">
            <Icon name="box.truck.fill" size={16} tone="brand" />
          </AppView>
          <AppView>
            <AppText className="text-[12px] font-semibold text-muted">{trip.dateStr}</AppText>
            <AppText className="text-[11px] font-medium text-foreground-secondary">
              {trip.distanceKm} km
            </AppText>
          </AppView>
        </AppView>

        <AppView className="items-end">
          <AppText className="text-[17px] font-black text-foreground">₹{trip.fare}</AppText>
          <AppView className="rounded-full bg-emerald-500/10 px-2 py-0.5">
            <AppText className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {trip.status}
            </AppText>
          </AppView>
        </AppView>
      </AppView>

      {/* Route details */}
      <AppView className="mt-3 gap-2">
        <AppView row className="items-start gap-2.5">
          <AppView className="mt-1 h-2.5 w-2.5 rounded-full border border-emerald-500 bg-white" />
          <AppText className="flex-1 text-[13px] font-medium text-foreground" numberOfLines={1}>
            {trip.pickup}
          </AppText>
        </AppView>

        <AppView row className="items-start gap-2.5">
          <AppView className="mt-1 h-2.5 w-2.5 rounded-full bg-brand" />
          <AppText className="flex-1 text-[13px] font-medium text-foreground" numberOfLines={1}>
            {trip.drop}
          </AppText>
        </AppView>
      </AppView>
    </AppView>
  );
}
