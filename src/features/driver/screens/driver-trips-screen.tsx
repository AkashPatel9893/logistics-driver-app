import { useState } from 'react';
import { RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppFlatList,
  AppPressable,
  AppSpinner,
  AppText,
  AppView,
  FocusAwareStatusBar,
  Icon,
  SegmentedControl,
} from '@/components/ui';
import { useTrips } from '@/hooks/use-earnings';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { formatRupees } from '@/lib/format';
import { isInSlot, MAX_OFFSET, periodSlot, stripOffsets, type TripPeriod } from '@/lib/trip-period';

import { DriverPastTripCard } from '../components/driver-past-trip-card';

const PERIODS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
] as const satisfies readonly { value: TripPeriod; label: string }[];

type TripStatus = 'completed' | 'cancelled' | 'missed';

const STATUSES: { value: TripStatus; label: string }[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'missed', label: 'Missed' },
];

function SummaryCard({ value, label }: { value: string; label: string }) {
  return (
    <AppView className="flex-1 items-center rounded-2xl border border-border bg-card px-3 py-3.5">
      <AppText className="text-[22px] font-black text-foreground">{value}</AppText>
      <AppText className="mt-0.5 text-[12px] font-medium text-muted">{label}</AppText>
    </AppView>
  );
}

export function DriverTripsScreen() {
  const insets = useSafeAreaInsets();
  const tripsQuery = useTrips();
  const { refreshing, refresh } = usePullToRefresh();
  const [period, setPeriod] = useState<TripPeriod>('day');
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<TripStatus>('completed');

  const allTrips = tripsQuery.data ?? [];
  const slot = periodSlot(period, offset);
  const trips = allTrips.filter((trip) => isInSlot(trip.endedAt, slot));
  const earned = trips.reduce((sum, trip) => sum + trip.driverEarning, 0);
  const offsets = stripOffsets(offset);
  const oldest = MAX_OFFSET[period];

  const changePeriod = (next: TripPeriod) => {
    setPeriod(next);
    setOffset(0);
  };

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />

      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        className="border-b border-border/80 bg-background/95 px-5 pb-3.5"
      >
        <AppText className="text-[24px] font-black text-foreground">My trips</AppText>
        <AppText className="text-[12px] font-medium text-muted">
          Completed trips and what you earned
        </AppText>
      </AppView>

      <AppFlatList
        data={status === 'completed' ? trips : []}
        keyExtractor={(trip) => trip.id}
        renderItem={({ item }) => <DriverPastTripCard trip={item} />}
        contentContainerClassName="gap-3 px-5 pb-32 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh(() => tripsQuery.refetch({ throwOnError: true }))}
          />
        }
        ListHeaderComponent={
          <AppView className="mb-1 gap-4">
            <SegmentedControl options={PERIODS} value={period} onChange={changePeriod} />

            <AppView row className="items-center gap-2">
              <AppPressable
                onPress={() => setOffset((o) => Math.min(o + 1, oldest))}
                disabled={offset >= oldest}
                accessibilityLabel="Earlier"
                className={`size-9 items-center justify-center rounded-full ${offset >= oldest ? 'opacity-30' : ''}`}
              >
                <Icon name="chevron.left" size={18} tone="brand" />
              </AppPressable>
              <AppView row className="flex-1 justify-between">
                {offsets
                  .filter((o) => o <= oldest)
                  .map((o) => {
                    const item = periodSlot(period, o);
                    const selected = o === offset;
                    return (
                      <AppPressable
                        key={o}
                        onPress={() => setOffset(o)}
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${item.label} ${item.sub}`}
                        className={`min-w-14 items-center rounded-xl px-2 py-2 ${selected ? 'bg-brand' : 'bg-surface-muted'}`}
                      >
                        <AppText
                          className={`text-[11px] font-semibold ${selected ? 'text-white' : 'text-muted'}`}
                        >
                          {item.label}
                        </AppText>
                        <AppText
                          className={`text-[14px] font-extrabold ${selected ? 'text-white' : 'text-foreground'}`}
                        >
                          {item.sub}
                        </AppText>
                      </AppPressable>
                    );
                  })}
              </AppView>
              <AppPressable
                onPress={() => setOffset((o) => Math.max(o - 1, 0))}
                disabled={offset === 0}
                accessibilityLabel="Later"
                className={`size-9 items-center justify-center rounded-full ${offset === 0 ? 'opacity-30' : ''}`}
              >
                <Icon name="chevron.right" size={18} tone="brand" />
              </AppPressable>
            </AppView>

            <AppView row className="gap-3">
              <SummaryCard value={String(trips.length)} label="Completed trips" />
              <SummaryCard value={formatRupees(earned)} label="Trip earnings" />
            </AppView>

            <AppView className="gap-3">
              <AppText className="text-[15px] font-extrabold text-foreground">Trip history</AppText>
              <AppView row className="gap-2">
                {STATUSES.map((s) => {
                  const selected = status === s.value;
                  return (
                    <AppPressable
                      key={s.value}
                      onPress={() => setStatus(s.value)}
                      accessibilityState={{ selected }}
                      className={`rounded-full border px-4 py-2 ${selected ? 'border-brand bg-brand/10' : 'border-border bg-surface-muted'}`}
                    >
                      <AppText
                        className={`text-[13px] font-bold ${selected ? 'text-brand' : 'text-muted'}`}
                      >
                        {s.label}
                      </AppText>
                    </AppPressable>
                  );
                })}
              </AppView>
            </AppView>
          </AppView>
        }
        ListEmptyComponent={
          tripsQuery.isLoading ? (
            <AppSpinner />
          ) : tripsQuery.isError ? (
            <AppText className="text-muted">Could not load trips. Pull to retry.</AppText>
          ) : (
            <AppView className="mt-2 items-center justify-center rounded-3xl border border-dashed border-border bg-card p-8">
              <AppView className="h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
                <Icon name="box.truck" size={30} tone="brand" />
              </AppView>
              <AppText className="mt-4 text-center text-[16px] font-extrabold text-foreground">
                {status === 'completed'
                  ? 'You have not completed any trips in this period'
                  : `${status === 'cancelled' ? 'Cancelled' : 'Missed'} trips are not available yet`}
              </AppText>
              <AppText className="mt-1 text-center text-[13px] leading-5 text-muted">
                {status === 'completed'
                  ? 'Pick another date above, or go online from Home to get requests.'
                  : 'Only completed trips are listed for now.'}
              </AppText>
            </AppView>
          )
        }
      />
    </AppView>
  );
}
