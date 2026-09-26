import { AppText, AppView } from '@/components/ui';
import { useNow } from '@/hooks/use-now';

/** Free waiting time at a stop before waiting charges would apply. */
const FREE_WAIT_SECONDS = 10 * 60;

export interface WaitingTimerRingProps {
  /** When the driver marked arrival (ISO). */
  arrivedAt: string;
  contactName: string;
  className?: string;
}

function mmss(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function WaitingTimerRing({
  arrivedAt,
  contactName,
  className = '',
}: WaitingTimerRingProps) {
  const now = useNow(1_000);
  const waited = Math.floor((now - Date.parse(arrivedAt)) / 1_000);
  const freeLeft = FREE_WAIT_SECONDS - waited;
  const firstName = contactName.split(' ')[0] ?? contactName;

  return (
    <AppView className={`items-center justify-center ${className}`}>
      <AppView
        className={`h-32 w-32 items-center justify-center rounded-full border-[7px] bg-card shadow-sm ${
          freeLeft > 0 ? 'border-brand' : 'border-red-500'
        }`}
      >
        <AppText className="text-[26px] font-black tracking-tight text-foreground">
          {mmss(waited)}
        </AppText>
        <AppText className="text-[11px] font-bold uppercase tracking-wider text-muted">
          WAITING
        </AppText>
      </AppView>
      <AppText className="mt-3 text-center text-[18px] font-black text-foreground">
        Waiting for {firstName}
      </AppText>
      <AppText className="mt-1 text-center text-[13px] font-medium text-muted">
        {freeLeft > 0
          ? `Free waiting time ends in ${mmss(freeLeft)}`
          : 'Free waiting time is over — call the customer'}
      </AppText>
    </AppView>
  );
}
