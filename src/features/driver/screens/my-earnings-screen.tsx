import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
  SegmentedControl,
} from '@/components/ui';
import { useDriverStore } from '@/stores/driver-store';

import { DriverPastTripCard } from '../components/driver-past-trip-card';
import { EarningsTrendChart } from '../components/earnings-trend-chart';

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
] as const;

type PeriodKey = (typeof PERIODS)[number]['value'];

export function MyEarningsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<PeriodKey>('week');

  const walletBalance = useDriverStore((s) => s.walletBalance);
  const totalEarnings = useDriverStore((s) => s.totalEarnings);
  const tripsCount = useDriverStore((s) => s.tripsCount);
  const onlineHours = useDriverStore((s) => s.onlineHours);
  const incentives = useDriverStore((s) => s.incentives);
  const pastTrips = useDriverStore((s) => s.pastTrips);

  const displayedEarnings = period === 'today' ? totalEarnings : period === 'week' ? 6980 : 28450;
  const displayedTrips = period === 'today' ? 4 : period === 'week' ? tripsCount : 112;

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />

      {/* Header */}
      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        className="border-b border-border/80 bg-card px-5 pb-3.5 shadow-sm"
      >
        <AppView row className="items-center justify-between">
          <AppView row className="items-center gap-3">
            <LiquidGlassBackButton onPress={() => router.back()} />
            <AppView>
              <AppText className="text-[20px] font-black text-foreground">My Earnings</AppText>
              <AppText className="text-[12px] text-muted">Weekly payouts & performance</AppText>
            </AppView>
          </AppView>

          <AppPressable
            onPress={() => router.push('/wallet')}
            className="rounded-full bg-brand/10 px-3 py-1.5"
          >
            <AppText className="text-[12px] font-bold text-brand">Wallet History</AppText>
          </AppPressable>
        </AppView>
      </AppView>

      <AppScrollView
        contentContainerClassName="px-5 pb-16 pt-4 gap-5"
        showsVerticalScrollIndicator={false}
      >
        {/* Available Balance Dark Card */}
        <AppView className="overflow-hidden rounded-3xl bg-neutral-950 p-6 shadow-xl dark:border dark:border-neutral-800">
          <AppView row className="items-center justify-between">
            <AppView>
              <AppText className="text-[13px] font-semibold text-neutral-400">
                Available to Withdraw
              </AppText>
              <AppText className="mt-1 text-[34px] font-black text-white">
                ₹{walletBalance.toLocaleString('en-IN')}
              </AppText>
            </AppView>

            <AppPressable
              onPress={() => router.push('/wallet')}
              pressScale={0.94}
              className="rounded-2xl bg-brand px-5 py-3 shadow-md active:bg-brand/90"
            >
              <AppText className="text-[14px] font-black text-white">Withdraw</AppText>
            </AppPressable>
          </AppView>

          <AppView
            row
            className="mt-5 items-center justify-between border-t border-neutral-800 pt-4"
          >
            <AppText className="text-[12px] text-neutral-400">
              Next automatic weekly payout: Tuesday
            </AppText>
            <AppView row className="items-center gap-1">
              <Icon name="checkmark.shield.fill" size={14} color="#10b981" />
              <AppText className="text-[12px] font-semibold text-emerald-400">
                Verified Bank
              </AppText>
            </AppView>
          </AppView>
        </AppView>

        {/* Time Period Selector */}
        <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} />

        {/* 4 Stat Cards Grid */}
        <AppView className="gap-2.5">
          <AppView row className="gap-2.5">
            <AppView className="flex-1 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
              <AppText className="text-[12px] font-medium text-muted">Orders</AppText>
              <AppText className="mt-1 text-[20px] font-black text-foreground">
                {displayedTrips}
              </AppText>
            </AppView>

            <AppView className="flex-1 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
              <AppText className="text-[12px] font-medium text-muted">Online Hours</AppText>
              <AppText className="mt-1 text-[20px] font-black text-foreground">
                {onlineHours}
              </AppText>
            </AppView>
          </AppView>

          <AppView row className="gap-2.5">
            <AppView className="flex-1 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
              <AppText className="text-[12px] font-medium text-muted">Trip Fares</AppText>
              <AppText className="mt-1 text-[20px] font-black text-foreground">
                ₹{(displayedEarnings - incentives).toLocaleString('en-IN')}
              </AppText>
            </AppView>

            <AppView className="flex-1 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
              <AppText className="text-[12px] font-medium text-muted">Incentives</AppText>
              <AppText className="mt-1 text-[20px] font-black text-brand">
                ₹{incentives.toLocaleString('en-IN')}
              </AppText>
            </AppView>
          </AppView>
        </AppView>

        {/* Weekly Trend Bar Chart */}
        <EarningsTrendChart />

        {/* Earnings Breakdown */}
        <AppView className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <AppText className="text-[15px] font-extrabold text-foreground">
            Earnings Breakdown
          </AppText>

          <AppView className="mt-4 gap-3">
            {/* Fares */}
            <AppView>
              <AppView row className="items-center justify-between text-[13px]">
                <AppText className="font-semibold text-foreground">Trip Fares</AppText>
                <AppText className="font-bold text-foreground">78% • ₹5,840</AppText>
              </AppView>
              <AppView className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <AppView className="h-full w-[78%] rounded-full bg-brand" />
              </AppView>
            </AppView>

            {/* Peak Surge */}
            <AppView>
              <AppView row className="items-center justify-between text-[13px]">
                <AppText className="font-semibold text-foreground">Peak Hour Surge</AppText>
                <AppText className="font-bold text-foreground">14% • ₹650</AppText>
              </AppView>
              <AppView className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <AppView className="h-full w-[14%] rounded-full bg-amber-500" />
              </AppView>
            </AppView>

            {/* Incentives */}
            <AppView>
              <AppView row className="items-center justify-between text-[13px]">
                <AppText className="font-semibold text-foreground">Incentives & Tips</AppText>
                <AppText className="font-bold text-foreground">8% • ₹490</AppText>
              </AppView>
              <AppView className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <AppView className="h-full w-[8%] rounded-full bg-emerald-500" />
              </AppView>
            </AppView>
          </AppView>
        </AppView>

        {/* Recent Trips */}
        <AppView className="gap-3">
          <AppView row className="items-center justify-between px-1">
            <AppText className="text-[16px] font-extrabold text-foreground">Recent Trips</AppText>
            <AppPressable onPress={() => router.push('/(tabs)/orders')}>
              <AppText className="text-[13px] font-bold text-brand">View All</AppText>
            </AppPressable>
          </AppView>

          {pastTrips.slice(0, 3).map((trip) => (
            <DriverPastTripCard key={trip.id} trip={trip} />
          ))}
        </AppView>
      </AppScrollView>
    </AppView>
  );
}
