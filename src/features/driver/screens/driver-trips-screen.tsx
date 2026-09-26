import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppScrollView,
  AppText,
  AppView,
  FocusAwareStatusBar,
  Icon,
  SegmentedControl,
} from '@/components/ui';
import { useDriverStore } from '@/stores/driver-store';

import { DriverPastTripCard } from '../components/driver-past-trip-card';

const TRIP_TABS = [
  { value: 'past', label: 'Past Trips' },
  { value: 'upcoming', label: 'Upcoming' },
] as const;

type TripTab = (typeof TRIP_TABS)[number]['value'];

export function DriverTripsScreen() {
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState<TripTab>('past');

  const pastTrips = useDriverStore((s) => s.pastTrips);
  const tripsCount = useDriverStore((s) => s.tripsCount);

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />

      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        className="border-b border-border/80 bg-background/95 px-5 pb-3.5 backdrop-blur-md"
      >
        <AppView row className="items-center justify-between">
          <AppView>
            <AppText className="text-[24px] font-black text-foreground">My Trips</AppText>
            <AppText className="text-[12px] font-medium text-muted">
              {tripsCount} total completed trips
            </AppText>
          </AppView>

          <AppView className="rounded-full bg-brand/10 px-3 py-1">
            <AppText className="text-[12px] font-bold text-brand">All Time</AppText>
          </AppView>
        </AppView>
      </AppView>

      <AppScrollView
        contentContainerClassName="px-5 pb-32 pt-4 gap-4"
        showsVerticalScrollIndicator={false}
      >
        <SegmentedControl options={TRIP_TABS} value={selectedTab} onChange={setSelectedTab} />

        {selectedTab === 'past' ? (
          <AppView className="gap-3 mt-1">
            {pastTrips.map((trip, index) => (
              <DriverPastTripCard key={`${trip.id}-${index}`} trip={trip} />
            ))}
          </AppView>
        ) : (
          <AppView className="items-center justify-center rounded-3xl border border-dashed border-border bg-card p-8 mt-2">
            <AppView className="h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
              <Icon name="calendar" size={30} tone="brand" />
            </AppView>
            <AppText className="mt-4 text-[16px] font-extrabold text-foreground">
              No Upcoming Scheduled Trips
            </AppText>
            <AppText className="mt-1 text-center text-[13px] leading-5 text-muted">
              Advance booking trips will appear here when scheduled by customers in your area.
            </AppText>
          </AppView>
        )}
      </AppScrollView>
    </AppView>
  );
}
