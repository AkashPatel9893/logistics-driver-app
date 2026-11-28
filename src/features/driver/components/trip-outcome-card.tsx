import { AppText, AppView, Icon } from '@/components/ui';
import type { TripOutcome } from '@/lib/api/models';
import { formatDayTime } from '@/lib/format';

const RESULT_TEXT: Record<NonNullable<TripOutcome['result']>, string> = {
  CANCELLED_BY_DRIVER: 'Cancelled by you',
  CANCELLED_BY_CUSTOMER: 'Cancelled by customer',
  CANCELLED_BY_OPS: 'Cancelled by Ryno',
  FAILED_DELIVERY: 'Delivery failed',
};

/** "CUSTOMER_UNREACHABLE" → "Customer unreachable"; text already written for people is kept. */
function readableReason(reason: string): string {
  if (!/^[A-Z0-9_]+$/.test(reason)) return reason;
  const words = reason.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A cancelled trip, failed delivery or missed request. No earnings, so no details screen. */
export function TripOutcomeCard({ trip }: { trip: TripOutcome }) {
  const title =
    trip.kind === 'missed'
      ? 'Request missed'
      : trip.result
        ? RESULT_TEXT[trip.result]
        : 'Cancelled';
  return (
    <AppView className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
      <AppView row className="items-center gap-2 border-b border-border/60 pb-3">
        <AppView className="h-8 w-8 items-center justify-center rounded-xl bg-surface-muted">
          <Icon name={trip.kind === 'missed' ? 'clock' : 'xmark'} size={16} tone="muted" />
        </AppView>
        <AppView className="flex-1">
          <AppText className="text-[14px] font-bold text-foreground">{title}</AppText>
          <AppText className="text-[11px] font-medium text-foreground-secondary">
            {`${formatDayTime(trip.endedAt)} · #${trip.orderNumber}`}
          </AppText>
          {trip.reason ? (
            <AppText className="mt-0.5 text-[12px] text-muted">
              {readableReason(trip.reason)}
            </AppText>
          ) : null}
        </AppView>
      </AppView>
      <AppView className="mt-3 gap-2">
        <AppView row className="items-start gap-2.5">
          <AppView className="mt-1 h-2.5 w-2.5 rounded-full border border-emerald-500 bg-white" />
          <AppText className="flex-1 text-[13px] font-medium text-foreground" numberOfLines={1}>
            {trip.pickupLabel || '—'}
          </AppText>
        </AppView>
        <AppView row className="items-start gap-2.5">
          <AppView className="mt-1 h-2.5 w-2.5 rounded-full bg-brand" />
          <AppText className="flex-1 text-[13px] font-medium text-foreground" numberOfLines={1}>
            {trip.dropLabel || '—'}
          </AppText>
        </AppView>
      </AppView>
    </AppView>
  );
}
