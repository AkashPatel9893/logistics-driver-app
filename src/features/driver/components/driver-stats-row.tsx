import { useRouter } from 'expo-router';

import { AppPressable, AppText, AppView } from '@/components/ui';

export interface DriverStatsRowProps {
  tripsCount: number;
  todayEarnings: number;
  walletBalance: number;
  className?: string;
}

export function DriverStatsRow({
  tripsCount,
  todayEarnings,
  walletBalance,
  className = '',
}: DriverStatsRowProps) {
  const router = useRouter();

  return (
    <AppView row className={`gap-2.5 ${className}`}>
      {/* Trips Card */}
      <AppPressable
        onPress={() => router.push('/(tabs)/orders')}
        pressScale={0.96}
        className="flex-1 rounded-[22px] border border-border/80 bg-card p-4 shadow-sm"
      >
        <AppText className="text-[11px] font-bold uppercase tracking-wider text-muted">
          TRIPS
        </AppText>
        <AppText className="mt-1.5 text-[22px] font-black text-foreground">{tripsCount}</AppText>
        {tripsCount > 0 ? (
          <AppText className="mt-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            +2 today
          </AppText>
        ) : null}
      </AppPressable>

      {/* Earnings Card */}
      <AppPressable
        onPress={() => router.push('/earnings')}
        pressScale={0.96}
        className="flex-1 rounded-[22px] border border-border/80 bg-card p-4 shadow-sm"
      >
        <AppText className="text-[11px] font-bold uppercase tracking-wider text-muted">
          EARNINGS
        </AppText>
        <AppText className="mt-1.5 text-[22px] font-black text-foreground">
          ₹{todayEarnings.toLocaleString('en-IN')}
        </AppText>
        {todayEarnings > 0 ? (
          <AppText className="mt-0.5 text-[11px] font-medium text-brand">Today</AppText>
        ) : null}
      </AppPressable>

      {/* Balance Card */}
      <AppPressable
        onPress={() => router.push('/wallet')}
        pressScale={0.96}
        className="flex-1 rounded-[22px] border border-border/80 bg-card p-4 shadow-sm"
      >
        <AppText className="text-[11px] font-bold uppercase tracking-wider text-muted">
          BALANCE
        </AppText>
        <AppText className="mt-1.5 text-[22px] font-black text-foreground">
          ₹{walletBalance.toLocaleString('en-IN')}
        </AppText>
        {walletBalance > 0 ? (
          <AppText className="mt-0.5 text-[11px] font-medium text-foreground-secondary">
            Available
          </AppText>
        ) : null}
      </AppPressable>
    </AppView>
  );
}
