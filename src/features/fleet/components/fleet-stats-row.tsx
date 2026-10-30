import { useRouter } from 'expo-router';

import { AppPressable, AppText, AppView } from '@/components/ui';
import { useFleetStats } from '@/hooks/use-fleet';
import { formatRupees } from '@/lib/format';

export interface FleetStatsRowProps {
  vehiclesCount?: number;
  totalEarnings?: number;
  walletBalance?: number;
  className?: string;
  onPressVehicles?: () => void;
}

export function FleetStatsRow({
  vehiclesCount,
  totalEarnings,
  walletBalance,
  className = '',
  onPressVehicles,
}: FleetStatsRowProps) {
  const router = useRouter();
  const { data: statsData } = useFleetStats();

  const count = vehiclesCount ?? statsData?.total_vehicles ?? 0;
  const earnings = totalEarnings ?? Number(statsData?.earnings?.total_revenue ?? 0);
  const balance = walletBalance ?? Number(statsData?.earnings?.balance ?? 0);

  const stats = [
    {
      label: 'Vehicles',
      value: String(count),
      onPress: onPressVehicles ?? (() => router.push('/driver-profile')),
    },
    {
      label: 'Total Earning',
      value: formatRupees(earnings),
      onPress: () => router.push('/earnings'),
    },
    {
      label: 'BALANCE',
      value: formatRupees(balance),
      onPress: () => router.push('/wallet'),
    },
  ];

  return (
    <AppView className={`gap-2 ${className}`}>
      <AppText className="px-1 text-[18px] font-extrabold text-foreground">Fleet Stats</AppText>
      <AppView row className="gap-2.5">
        {stats.map((stat) => (
          <AppPressable
            key={stat.label}
            onPress={stat.onPress}
            pressScale={0.96}
            className="flex-1 rounded-[22px] border border-border/80 bg-card p-4 shadow-sm"
          >
            <AppText className="text-[11px] font-bold uppercase tracking-wider text-muted">
              {stat.label}
            </AppText>
            <AppText className="mt-1.5 text-[20px] font-black text-foreground" numberOfLines={1}>
              {stat.value}
            </AppText>
          </AppPressable>
        ))}
      </AppView>
    </AppView>
  );
}
