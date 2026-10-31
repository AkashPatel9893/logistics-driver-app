import { AppText, AppView, Icon } from '@/components/ui';
import type { TripSummary } from '@/lib/api/models';
import { formatDayTime, formatDistance, formatRupees } from '@/lib/format';

export function DriverPastTripCard({ trip }: { trip: TripSummary }) {
  return (
    <AppView className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
      <AppView row className="items-center justify-between border-b border-border/60 pb-3">
        <AppView row className="flex-1 items-center gap-2">
          <AppView className="h-8 w-8 items-center justify-center rounded-xl bg-brand/10">
            <Icon name="box.truck.fill" size={16} tone="brand" />
          </AppView>
          <AppView className="flex-1">
            <AppText className="text-[12px] font-semibold text-muted">
              {formatDayTime(trip.endedAt)}
            </AppText>
            <AppText className="text-[11px] font-medium text-foreground-secondary">
              {[
                `#${trip.orderNumber ?? trip.number}`,
                trip.distanceKm != null ? formatDistance(trip.distanceKm) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
            {trip.paidTo === 'FLEET' ? (
              <AppText className="text-[11px] text-muted">
                Paid to {trip.fleetName || 'fleet'}
              </AppText>
            ) : null}
          </AppView>
        </AppView>
        <AppView className="items-end">
          <AppText className="text-[17px] font-black text-foreground">
            {formatRupees(trip.driverEarning)}
          </AppText>
          <AppView className="rounded-full bg-surface-muted px-2 py-0.5">
            <AppText className="text-[10px] font-bold text-muted">
              {trip.status.replace(/_/g, ' ')}
            </AppText>
          </AppView>
        </AppView>
      </AppView>
      <AppView className="mt-3 gap-2">
        <AppView row className="items-start gap-2.5">
          <AppView className="mt-1 h-2.5 w-2.5 rounded-full border border-emerald-500 bg-white" />
          <AppText className="flex-1 text-[13px] font-medium text-foreground" numberOfLines={1}>
            {trip.pickupLabel ?? '—'}
          </AppText>
        </AppView>
        <AppView row className="items-start gap-2.5">
          <AppView className="mt-1 h-2.5 w-2.5 rounded-full bg-brand" />
          <AppText className="flex-1 text-[13px] font-medium text-foreground" numberOfLines={1}>
            {trip.dropLabel ?? '—'}
          </AppText>
        </AppView>
      </AppView>
    </AppView>
  );
}
