import { AppText, AppView, Icon } from '@/components/ui';

const TARGET = 10;

export interface TripTrackerProps {
  /** Trips the driver has completed in total. */
  completedTrips: number;
}

/** First-10-trips tracker: ten dots that fill as the driver completes trips. */
export function TripTracker({ completedTrips }: TripTrackerProps) {
  if (completedTrips >= TARGET) return null;
  const done = Math.max(completedTrips, 0);
  return (
    <AppView
      className="gap-2.5 rounded-2xl border border-border/80 bg-surface-muted px-4 py-3.5"
      accessibilityLabel={`${done} of ${TARGET} trips completed`}
    >
      <AppView className="self-start rounded-md bg-brand px-2 py-1">
        <AppText className="text-[11px] font-bold text-white">
          Complete {TARGET} trips to start
        </AppText>
      </AppView>
      <AppText className="text-[15px] font-bold text-foreground">
        {done} of {TARGET} trips done
      </AppText>
      <AppView row className="items-center justify-between border-t border-border/60 pt-3">
        {Array.from({ length: TARGET }, (_, i) => (
          <AppView
            key={i}
            className={`size-[22px] items-center justify-center rounded-full ${i < done ? 'bg-emerald-500' : 'bg-border'}`}
          >
            {i < done ? <Icon name="checkmark.circle.fill" size={14} color="#ffffff" /> : null}
          </AppView>
        ))}
      </AppView>
    </AppView>
  );
}
