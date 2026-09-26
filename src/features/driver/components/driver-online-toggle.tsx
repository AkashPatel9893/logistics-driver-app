import { Switch } from 'react-native';

import { AppText, AppView } from '@/components/ui';

export interface DriverOnlineToggleProps {
  isOnline: boolean;
  onToggle: () => void;
  className?: string;
}

export function DriverOnlineToggle({
  isOnline,
  onToggle,
  className = '',
}: DriverOnlineToggleProps) {
  return (
    <AppView
      className={`flex-row items-center justify-between rounded-full px-5 py-3 border transition-all ${
        isOnline
          ? 'bg-[#E8F8EE] border-[#B9E9CA] dark:bg-emerald-950/40 dark:border-emerald-800/40'
          : 'bg-neutral-100 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700'
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
          {isOnline
            ? 'Finding delivery requests nearby'
            : 'Go online to receive nearby delivery requests'}
        </AppText>
      </AppView>

      <Switch
        value={isOnline}
        onValueChange={onToggle}
        trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
        thumbColor="#FFFFFF"
      />
    </AppView>
  );
}
