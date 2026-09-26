import { useRouter } from 'expo-router';

import { AppPressable, AppText, AppView } from '@/components/ui';
import { formatRupees } from '@/lib/format';

export interface DriverStatsRowProps {
  tripsToday: number;
  earningsToday: number;
  walletBalance: number;
  className?: string;
}

export function DriverStatsRow({
  tripsToday,
  earningsToday,
  walletBalance,
  className = '',
}: DriverStatsRowProps) {
  const router = useRouter();

  const stats = [
    { label: 'TRIPS', value: String(tripsToday), note: 'Today', route: '/(tabs)/orders' as const },
    {
      label: 'EARNED',
      value: formatRupees(earningsToday),
      note: 'Today',
      route: '/earnings' as const,
    },
    {
      label: 'BALANCE',
      value: formatRupees(walletBalance),
      note: 'Wallet',
      route: '/wallet' as const,
    },
  ];

  return (
    <AppView row className={`gap-2.5 ${className}`}>
      {stats.map((stat) => (
        <AppPressable
          key={stat.label}
          onPress={() => router.push(stat.route)}
          pressScale={0.96}
          accessibilityLabel={`${stat.label} ${stat.value}, ${stat.note}`}
          className="flex-1 rounded-[22px] border border-border/80 bg-card p-4 shadow-sm"
        >
          <AppText className="text-[11px] font-bold uppercase tracking-wider text-muted">
            {stat.label}
          </AppText>
          <AppText className="mt-1.5 text-[20px] font-black text-foreground" numberOfLines={1}>
            {stat.value}
          </AppText>
          <AppText className="mt-0.5 text-[11px] font-medium text-foreground-secondary">
            {stat.note}
          </AppText>
        </AppPressable>
      ))}
    </AppView>
  );
}
