import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  Icon,
  SegmentedControl,
} from '@/components/ui';
import { useEarnings, useTrips } from '@/hooks/use-earnings';
import type { EarningsPeriod } from '@/lib/api/models';
import { formatMinutes, formatRupees } from '@/lib/format';

import { DriverPastTripCard } from '../components/driver-past-trip-card';
import { EarningsTrendChart } from '../components/earnings-trend-chart';
import { SetupScreenLayout } from '../components/setup-screen-layout';
import { WalletContent } from './driver-wallet-screen';

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'This month' },
] as const satisfies readonly { value: EarningsPeriod; label: string }[];

type EarningsTab = 'earnings' | 'wallet';

const TABS: { value: EarningsTab; label: string }[] = [
  { value: 'earnings', label: 'All earnings' },
  { value: 'wallet', label: 'Wallet' },
];

function TabBar({ tab, onChange }: { tab: EarningsTab; onChange: (tab: EarningsTab) => void }) {
  return (
    <AppView row className="border-b border-border/80 bg-surface px-5">
      {TABS.map((t) => {
        const selected = tab === t.value;
        return (
          <AppPressable
            key={t.value}
            onPress={() => onChange(t.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            className={`flex-1 items-center border-b-2 py-3 ${selected ? 'border-brand' : 'border-transparent'}`}
          >
            <AppText className={`text-[14px] font-bold ${selected ? 'text-brand' : 'text-muted'}`}>
              {t.label}
            </AppText>
          </AppPressable>
        );
      })}
    </AppView>
  );
}

function LinkRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: 'box.truck' | 'banknote';
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <AppPressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-3 border-t border-border/60 px-4 py-3.5"
    >
      <AppView className="size-9 items-center justify-center rounded-full bg-surface-muted">
        <Icon name={icon} size={16} tone="brand" />
      </AppView>
      <AppView className="flex-1">
        <AppText className="text-[15px] font-bold text-foreground">{title}</AppText>
        {subtitle ? <AppText className="text-[12px] text-muted">{subtitle}</AppText> : null}
      </AppView>
      <Icon name="chevron.right" size={16} tone="icon-subtle" />
    </AppPressable>
  );
}

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
  const todayQuery = useEarnings('today');
  const [tab, setTab] = useState<EarningsTab>('earnings');
  const tripsQuery = useTrips();
  const trips = tripsQuery.data ?? [];

  return (
    <SetupScreenLayout title="Earnings" subtitle="Trips, incentives and wallet">
      <TabBar tab={tab} onChange={setTab} />
      {tab === 'wallet' ? (
        <WalletContent />
      ) : (
        <AppScrollView
          contentContainerClassName="gap-5 px-5 pb-16 pt-4"
          showsVerticalScrollIndicator={false}
        >
          <AppView className="overflow-hidden rounded-2xl border border-border bg-card">
            <AppView className="items-center py-4">
              <AppText className="text-[13px] font-medium text-muted">
                Today&apos;s earnings
              </AppText>
              <AppText className="mt-1 text-[34px] font-black text-foreground">
                {todayQuery.data ? formatRupees(todayQuery.data.totalEarnings) : '—'}
              </AppText>
            </AppView>
            <LinkRow
              icon="box.truck"
              title="All trips"
              subtitle="Trip history and trip earnings"
              onPress={() => router.push('/(tabs)/orders')}
            />
          </AppView>

          <AppView className="overflow-hidden rounded-2xl border border-border bg-card">
            <LinkRow
              icon="banknote"
              title="View rate card"
              onPress={() => router.push('/rate-card')}
            />
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
              <StatCard
                label="Incentives"
                value={summary ? formatRupees(summary.incentives) : '—'}
              />
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

          {summary && (summary.tipEarnings > 0 || summary.priorityEarnings > 0) ? (
            <AppText className="text-[13px] text-muted">
              Includes{' '}
              {[
                summary.tipEarnings > 0 &&
                  `${formatRupees(summary.tipEarnings)} in customer tips (100% yours)`,
                summary.priorityEarnings > 0 &&
                  `${formatRupees(summary.priorityEarnings)} from priority bookings`,
              ]
                .filter(Boolean)
                .join(' and ')}
              .
            </AppText>
          ) : null}
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
      )}
    </SetupScreenLayout>
  );
}
