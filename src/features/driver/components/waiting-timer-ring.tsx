import { useEffect, useState } from 'react';

import { AppText, AppView } from '@/components/ui';

export interface WaitingTimerRingProps {
  initialSeconds?: number;
  customerName?: string;
  className?: string;
}

export function WaitingTimerRing({
  initialSeconds = 222,
  customerName = 'Priya',
  className = '',
}: WaitingTimerRingProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <AppView className={`items-center justify-center ${className}`}>
      {/* Orange Border Timer Ring */}
      <AppView className="h-32 w-32 items-center justify-center rounded-full border-[7px] border-brand bg-card shadow-sm">
        <AppText className="text-[26px] font-black tracking-tight text-foreground">
          {timeFormatted}
        </AppText>
        <AppText className="text-[11px] font-bold uppercase tracking-wider text-muted">
          WAITING
        </AppText>
      </AppView>
      <AppText className="mt-3 text-center text-[18px] font-black text-foreground">
        Waiting for {customerName}
      </AppText>
      <AppText className="mt-1 text-center text-[13px] font-medium text-muted">
        Free waiting time ends in 1 min 18 sec
      </AppText>
    </AppView>
  );
}
