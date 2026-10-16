import { AppPressable, AppText, AppView } from '@/components/ui';

import type { DashboardRole } from '../types';

export interface RoleSwitcherProps {
  role: DashboardRole;
  onChangeRole: (role: DashboardRole) => void;
  className?: string;
}

export function RoleSwitcher({ role, onChangeRole, className = '' }: RoleSwitcherProps) {
  const isDriver = role === 'driver';

  return (
    <AppView row className={`items-center gap-2.5 ${className}`}>
      <AppPressable
        onPress={() => onChangeRole('driver')}
        pressScale={0.96}
        accessibilityRole="button"
        accessibilityLabel="Driver mode"
        className={`flex-1 items-center justify-center rounded-full py-2.5 transition-colors ${
          isDriver
            ? 'bg-[#FF5722] shadow-sm'
            : 'border border-border/80 bg-[#F3ECE6] dark:bg-neutral-800'
        }`}
      >
        <AppText
          className={`text-[14px] font-bold ${
            isDriver ? 'text-white' : 'text-foreground-secondary dark:text-neutral-300'
          }`}
        >
          Driver
        </AppText>
      </AppPressable>

      <AppPressable
        onPress={() => onChangeRole('owner')}
        pressScale={0.96}
        accessibilityRole="button"
        accessibilityLabel="Fleet Owner mode"
        className={`flex-1 items-center justify-center rounded-full py-2.5 transition-colors ${
          !isDriver
            ? 'bg-[#FF5722] shadow-sm'
            : 'border border-border/80 bg-[#F3ECE6] dark:bg-neutral-800'
        }`}
      >
        <AppText
          className={`text-[14px] font-bold ${
            !isDriver ? 'text-white' : 'text-foreground-secondary dark:text-neutral-300'
          }`}
        >
          Fleet Owner
        </AppText>
      </AppPressable>
    </AppView>
  );
}
