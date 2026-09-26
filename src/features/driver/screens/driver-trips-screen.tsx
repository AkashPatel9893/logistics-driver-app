import { RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppFlatList,
  AppSpinner,
  AppText,
  AppView,
  FocusAwareStatusBar,
  Icon,
} from '@/components/ui';
import { useTrips } from '@/hooks/use-earnings';

import { DriverPastTripCard } from '../components/driver-past-trip-card';

export function DriverTripsScreen() {
  const insets = useSafeAreaInsets();
  const tripsQuery = useTrips();
  const trips = tripsQuery.data ?? [];
  const delivered = trips.filter((t) => t.status === 'delivered').length;

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />

      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        className="border-b border-border/80 bg-background/95 px-5 pb-3.5"
      >
        <AppText className="text-[24px] font-black text-foreground">My trips</AppText>
        <AppText className="text-[12px] font-medium text-muted">
          {delivered} delivered
          {trips.length > delivered ? ` · ${trips.length - delivered} cancelled` : ''}
        </AppText>
      </AppView>

      <AppFlatList
        data={trips}
        keyExtractor={(trip) => trip.id}
        renderItem={({ item }) => <DriverPastTripCard trip={item} />}
        contentContainerClassName="gap-3 px-5 pb-32 pt-4"
        refreshControl={
          <RefreshControl refreshing={tripsQuery.isRefetching} onRefresh={tripsQuery.refetch} />
        }
        ListEmptyComponent={
          tripsQuery.isLoading ? (
            <AppSpinner />
          ) : (
            <AppView className="mt-2 items-center justify-center rounded-3xl border border-dashed border-border bg-card p-8">
              <AppView className="h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
                <Icon name="box.truck" size={30} tone="brand" />
              </AppView>
              <AppText className="mt-4 text-[16px] font-extrabold text-foreground">
                No trips yet
              </AppText>
              <AppText className="mt-1 text-center text-[13px] leading-5 text-muted">
                Go online from Home to start receiving delivery requests.
              </AppText>
            </AppView>
          )
        }
      />
    </AppView>
  );
}
