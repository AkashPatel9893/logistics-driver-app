import { AppText, AppView } from '@/components/ui';
import { useNow } from '@/hooks/use-now';

/** Used only when the backend sent no waiting plan for the stop. */
const FALLBACK_FREE_WAIT_SECONDS = 10 * 60;

function mmss(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Slim waiting timer for a stop: time waited and how much free waiting is left. */
export function WaitingBar({
  arrivedAt,
  freeWaitingUntil,
  ratePerMinute,
}: {
  arrivedAt: string;
  freeWaitingUntil?: string | null;
  ratePerMinute?: number | null;
}) {
  const now = useNow(1_000);
  const waited = Math.floor((now - Date.parse(arrivedAt)) / 1_000);
  // The free window comes from the order's plan; the 10 minutes is only a fallback.
  const freeSeconds = freeWaitingUntil
    ? Math.max(1, Math.round((Date.parse(freeWaitingUntil) - Date.parse(arrivedAt)) / 1_000))
    : FALLBACK_FREE_WAIT_SECONDS;
  const freeLeft = freeSeconds - waited;
  const overtime = freeLeft <= 0;
  const progress = Math.min(1, Math.max(0, waited / freeSeconds));

  return (
    <AppView className={`rounded-2xl px-4 py-3 ${overtime ? 'bg-red-500/10' : 'bg-surface-muted'}`}>
      <AppView row className="items-baseline justify-between">
        <AppText className="text-[13px] font-semibold text-foreground-secondary">
          Waiting{' '}
          <AppText className="text-[15px] font-black text-foreground">{mmss(waited)}</AppText>
        </AppText>
        <AppText
          className={`text-[12px] font-semibold ${overtime ? 'text-red-600 dark:text-red-400' : 'text-muted'}`}
        >
          {overtime
            ? ratePerMinute
              ? `Waiting charges apply · ₹${ratePerMinute}/min`
              : 'Waiting charges apply'
            : `Free for ${mmss(freeLeft)}`}
        </AppText>
      </AppView>
      <AppView className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
        <AppView
          style={{ width: `${progress * 100}%` }}
          className={`h-full rounded-full ${overtime ? 'bg-red-500' : 'bg-brand'}`}
        />
      </AppView>
    </AppView>
  );
}
