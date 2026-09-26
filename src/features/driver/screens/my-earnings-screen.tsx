import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AppPressable, AppScrollView, AppText, AppView, SegmentedControl } from '@/components/ui';
import { useEarnings, useTrips, useWallet } from '@/hooks/use-earnings';
import type { EarningsPeriod } from '@/lib/api/models';
import { formatMinutes, formatRupees } from '@/lib/format';

import { DriverPastTripCard } from '../components/driver-past-trip-card';
import { EarningsTrendChart } from '../components/earnings-trend-chart';
import { SetupScreenLayout } from '../components/setup-screen-layout';

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'This month' },
] as const satisfies readonly { value: EarningsPeriod; label: string }[];

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <AppView className="flex-1 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
      <AppText className="text-[12px] font-medium text-muted">{label}</AppText>
      <AppText
        className={`mt-1 text-[20px] font-black ${accent ? 'text-brand' : 'text-foreground'}`}
      >
        {value}
      </AppText>
    </AppView>
  );
}

export function MyEarningsScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<EarningsPeriod>('week');
  const { data: summary } = useEarnings(period);
  const { data: wallet } = useWallet();
  const { data: trips = [] } = useTrips();

  return (
    <SetupScreenLayout title="My earnings" subtitle="Trips, incentives and online time">
      <AppScrollView
        contentContainerClassName="gap-5 px-5 pb-16 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <AppView className="overflow-hidden rounded-3xl bg-neutral-950 p-6 shadow-xl dark:border dark:border-neutral-800">
          <AppView row className="items-center justify-between">
            <AppView>
              <AppText className="text-[13px] font-semibold text-neutral-400">
                Wallet balance
              </AppText>
              <AppText className="mt-1 text-[34px] font-black text-white">
                {wallet ? formatRupees(wallet.balance) : '—'}
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
          <AppText className="mt-4 border-t border-neutral-800 pt-4 text-[12px] text-neutral-400">
            {wallet?.bankLabel
              ? `Payouts to ${wallet.bankLabel}`
              : 'Add a bank account to withdraw'}
          </AppText>
        </AppView>

        <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} />

        <AppView className="gap-2.5">
          <AppView row className="gap-2.5">
            <StatCard
              label="Total earned"
              value={formatRupees(summary?.totalEarnings ?? 0)}
              accent
            />
            <StatCard label="Trips" value={String(summary?.trips ?? 0)} />
          </AppView>
          <AppView row className="gap-2.5">
            <StatCard label="Trip earnings" value={formatRupees(summary?.tripEarnings ?? 0)} />
            <StatCard label="Incentives" value={formatRupees(summary?.incentives ?? 0)} />
          </AppView>
          <AppView row className="gap-2.5">
            <StatCard label="Online time" value={formatMinutes(summary?.onlineMinutes ?? 0)} />
            <StatCard label="Cash collected" value={formatRupees(summary?.cashCollected ?? 0)} />
          </AppView>
        </AppView>

        {summary ? (
          <EarningsTrendChart
            title={period === 'month' ? 'By week' : 'Last 7 days'}
            buckets={summary.buckets}
          />
        ) : null}

        <AppView className="gap-3">
          <AppView row className="items-center justify-between px-1">
            <AppText className="text-[16px] font-extrabold text-foreground">Recent trips</AppText>
            {trips.length > 0 ? (
              <AppPressable onPress={() => router.push('/(tabs)/orders')}>
                <AppText className="text-[13px] font-bold text-brand">View all</AppText>
              </AppPressable>
            ) : null}
          </AppView>
          {trips.length === 0 ? (
            <AppText className="px-1 text-[13px] text-muted">
              Completed trips will appear here.
            </AppText>
          ) : (
            trips.slice(0, 3).map((trip) => <DriverPastTripCard key={trip.id} trip={trip} />)
          )}
        </AppView>
      </AppScrollView>
    </SetupScreenLayout>
  );
}
