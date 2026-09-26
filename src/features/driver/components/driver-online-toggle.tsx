import { Switch } from 'react-native';

import { AppText, AppView } from '@/components/ui';

export interface DriverOnlineToggleProps {
  isOnline: boolean;
  onToggle: (next: boolean) => void;
  /** Why the driver can't go online, shown instead of the usual hint. */
  blockedReason?: string | null;
  busy?: boolean;
  className?: string;
}

export function DriverOnlineToggle({
  isOnline,
  onToggle,
  blockedReason,
  busy = false,
  className = '',
}: DriverOnlineToggleProps) {
  const hint = isOnline
    ? 'Receiving delivery requests nearby'
    : (blockedReason ?? 'Go online to receive delivery requests');

  return (
    <AppView
      className={`flex-row items-center justify-between rounded-full border px-5 py-3 ${
        isOnline
          ? 'border-[#B9E9CA] bg-[#E8F8EE] dark:border-emerald-800/40 dark:bg-emerald-950/40'
          : 'border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800'
      } ${className}`}
    >
      <AppView className="flex-1 pr-3">
        <AppText
          className={`text-[16px] font-extrabold ${
            isOnline ? 'text-[#147A3B] dark:text-emerald-400' : 'text-foreground'
          }`}
        >
          {isOnline ? "You're online" : "You're offline"}
        </AppText>
        <AppText
          className={`text-[12px] font-medium ${
            isOnline ? 'text-[#2B824F] dark:text-emerald-300/80' : 'text-muted'
          }`}
        >
          {hint}
        </AppText>
      </AppView>

      <Switch
        value={isOnline}
        onValueChange={onToggle}
        disabled={busy}
        accessibilityLabel={isOnline ? 'Go offline' : 'Go online'}
        trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
        thumbColor="#FFFFFF"
      />
    </AppView>
  );
}
