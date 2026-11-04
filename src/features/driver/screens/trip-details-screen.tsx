import { useLocalSearchParams } from 'expo-router';

import { AppScrollView, AppSpinner, AppText, AppView } from '@/components/ui';
import { useTrips } from '@/hooks/use-earnings';
import { formatDayTime, formatDistance, formatRupees } from '@/lib/format';

import { SetupScreenLayout } from '../components/setup-screen-layout';

/** Plain words for the earning statuses the backend sends. */
const STATUS_LABEL: Record<string, string> = {
  WALLET_SETTLED: 'Added to your wallet',
  FLEET_SETTLED: 'Paid to your fleet owner',
  PENDING: 'Being processed',
};

function Line({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <AppView row className="mt-2 justify-between">
      <AppText
        className={strong ? 'text-[15px] font-bold text-foreground' : 'text-[14px] text-muted'}
      >
        {label}
      </AppText>
      <AppText
        className={
          strong ? 'text-[15px] font-black text-foreground' : 'text-[14px] text-foreground'
        }
      >
        {value}
      </AppText>
    </AppView>
  );
}

/** One past trip: where it went and how its earning was worked out. */
export function TripDetailsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const tripsQuery = useTrips();
  const trip = tripsQuery.data?.find((t) => t.id === tripId);

  return (
    <SetupScreenLayout
      title="Trip details"
      subtitle={trip ? `#${trip.orderNumber ?? trip.number}` : 'Past trip'}
    >
      {!trip ? (
        <AppView className="flex-1 items-center justify-center p-8">
          {tripsQuery.isLoading ? (
            <AppSpinner />
          ) : (
            <AppText className="text-center text-muted">This trip could not be loaded.</AppText>
          )}
        </AppView>
      ) : (
        <AppScrollView contentContainerClassName="gap-4 p-5 pb-12">
          <AppView className="rounded-2xl border border-border bg-card p-4">
            <AppText className="text-[12px] font-semibold text-muted">
              {formatDayTime(trip.endedAt)}
              {trip.distanceKm != null ? ` · ${formatDistance(trip.distanceKm)}` : ''}
            </AppText>
            <AppView row className="mt-3 items-start gap-2.5">
              <AppView className="mt-1 h-2.5 w-2.5 rounded-full border border-emerald-500 bg-white" />
              <AppText className="flex-1 text-[14px] font-semibold text-foreground">
                {trip.pickupLabel ?? 'Pickup'}
              </AppText>
            </AppView>
            <AppView row className="mt-2 items-start gap-2.5">
              <AppView className="mt-1 h-2.5 w-2.5 rounded-full bg-brand" />
              <AppText className="flex-1 text-[14px] font-semibold text-foreground">
                {trip.dropLabel ?? 'Drop'}
              </AppText>
            </AppView>
          </AppView>

          <AppView className="rounded-2xl border border-border bg-card p-4">
            <AppText className="text-[15px] font-bold text-foreground">Your earning</AppText>
            <Line label="Trip earning" value={formatRupees(trip.grossEarning)} />
            <Line
              label={`Commission (${trip.commissionRate}%)`}
              value={`− ${formatRupees(trip.commission)}`}
            />
            <AppView className="mt-3 border-t border-border/60 pt-1">
              <Line label="You earned" value={formatRupees(trip.driverEarning)} strong />
            </AppView>
            <AppText className="mt-3 text-[12px] text-muted">
              {trip.paidTo === 'FLEET'
                ? `Paid to ${trip.fleetName || 'your fleet owner'}`
                : (STATUS_LABEL[trip.status] ?? trip.status.replace(/_/g, ' ').toLowerCase())}
            </AppText>
          </AppView>
        </AppScrollView>
      )}
    </SetupScreenLayout>
  );
}
