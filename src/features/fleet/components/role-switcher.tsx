import { AppPressable, AppText, AppView } from '@/components/ui';

import type { DashboardRole } from '../types';

export interface RoleSwitcherProps {
  role: DashboardRole;
  onChangeRole: (role: DashboardRole) => void;
  /** Locked until the admin verifies the account: both options are visible but cannot be pressed. */
  locked?: boolean;
  className?: string;
}

export function RoleSwitcher({
  role,
  onChangeRole,
  locked = false,
  className = '',
}: RoleSwitcherProps) {
  const isDriver = role === 'driver';

  return (
    <AppView row className={`items-center gap-2.5 ${locked ? 'opacity-50' : ''} ${className}`}>
      <AppPressable
        onPress={() => onChangeRole('driver')}
        disabled={locked}
        pressScale={0.96}
        accessibilityRole="button"
        accessibilityState={{ selected: isDriver, disabled: locked }}
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
        disabled={locked}
        pressScale={0.96}
        accessibilityRole="button"
        accessibilityState={{ selected: !isDriver, disabled: locked }}
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
