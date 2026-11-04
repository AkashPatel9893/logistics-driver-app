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
  const summaryQuery = useEarnings(period);
  const { data: summary } = summaryQuery;
  const { data: wallet } = useWallet();
  const tripsQuery = useTrips();
  const trips = tripsQuery.data ?? [];

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
            Withdrawals are sent to your verified bank account.
          </AppText>
        </AppView>

        <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} />

        <AppView className="gap-2.5">
          <AppView row className="gap-2.5">
            <StatCard
              label="Total earned"
              value={summary ? formatRupees(summary.totalEarnings) : '—'}
              accent
            />
            <StatCard label="Trips" value={summary ? String(summary.trips) : '—'} />
          </AppView>
          <AppView row className="gap-2.5">
            <StatCard
              label="Trip earnings"
              value={summary ? formatRupees(summary.tripEarnings) : '—'}
            />
            <StatCard label="Incentives" value={summary ? formatRupees(summary.incentives) : '—'} />
          </AppView>
          <AppView row className="gap-2.5">
            <StatCard
              label="Online time"
              value={summary?.onlineMinutes != null ? formatMinutes(summary.onlineMinutes) : '—'}
            />
            <StatCard
              label="Cash collected"
              value={summary ? formatRupees(summary.cashCollected) : '—'}
            />
          </AppView>
        </AppView>

        {summary && summary.paidToFleet > 0 ? (
          <AppText className="text-[13px] text-muted">
            Includes {formatRupees(summary.paidToFleet)} paid to your fleet owner.
          </AppText>
        ) : null}
        {summaryQuery.isError ? (
          <AppText className="text-muted">Could not load earnings. Try again later.</AppText>
        ) : null}
        {summary ? <EarningsTrendChart title="Daily earnings" buckets={summary.buckets} /> : null}

        <AppView className="gap-3">
          <AppView row className="items-center justify-between px-1">
            <AppText className="text-[16px] font-extrabold text-foreground">Recent trips</AppText>
            {trips.length > 0 ? (
              <AppPressable onPress={() => router.push('/(tabs)/orders')}>
                <AppText className="text-[13px] font-bold text-brand">View all</AppText>
              </AppPressable>
            ) : null}
          </AppView>
          {tripsQuery.isError ? (
            <AppText className="px-1 text-muted">Could not load recent trips.</AppText>
          ) : tripsQuery.isLoading ? (
            <AppText className="px-1 text-muted">Loading trips…</AppText>
          ) : trips.length === 0 ? (
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
