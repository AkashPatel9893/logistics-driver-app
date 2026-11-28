import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  LiquidGlassBackButton,
} from '@/components/ui';
import {
  useApproveLinkRequest,
  useAssignFleetDriver,
  useFleetDrivers,
  useFleetLinkRequests,
  useFleetVehicles,
  useRejectLinkRequest,
  useRemoveFleetDriver,
} from '@/hooks/use-fleet';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { getErrorMessage } from '@/lib/api/api-error';
import type { FleetMemberResponse, LinkRequestResponse } from '@/lib/api/fleet';
import { goBack } from '@/lib/go-back';

import { DriverOptionsSheet, type DriverOption } from '../components/driver-options-sheet';
import { FleetMemberCard } from '../components/fleet-member-card';
import { JoinRequestCard } from '../components/join-request-card';

type AssignTarget = Pick<FleetMemberResponse, 'id' | 'name'>;

/** The fleet owner's drivers: requests to join, invites, and everyone already in the fleet. */
export function FleetDriversScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const requests = useFleetLinkRequests();
  const drivers = useFleetDrivers();
  const { data: vehicles = [] } = useFleetVehicles();
  const approve = useApproveLinkRequest();
  const reject = useRejectLinkRequest();
  const assign = useAssignFleetDriver();
  const remove = useRemoveFleetDriver();
  const { refreshing, refresh } = usePullToRefresh();
  const [assigning, setAssigning] = useState<AssignTarget | null>(null);

  // The owner appears on the vehicle they drive, not in this list.
  const members = (drivers.data ?? []).filter((member) => !member.is_owner_self);
  const pending = requests.data ?? [];
  const busy = approve.isPending || reject.isPending || assign.isPending || remove.isPending;
  const failure = drivers.error ?? requests.error;

  const reload = () =>
    Promise.all([
      drivers.refetch({ throwOnError: true }),
      requests.refetch({ throwOnError: true }),
    ]);

  const startAssigning = (driver: AssignTarget) => {
    if (vehicles.length > 0) {
      setAssigning(driver);
      return;
    }
    Alert.alert('Add a vehicle first', `Your fleet has no vehicle for ${driver.name} yet.`, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Add vehicle', onPress: () => router.push('/setup-vehicle') },
    ]);
  };

  const handleApprove = (request: LinkRequestResponse) =>
    approve.mutate(request.request_id, {
      onSuccess: () =>
        Alert.alert('Driver added', `${request.driver.name} is now in your fleet.`, [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Assign vehicle',
            onPress: () => startAssigning({ id: request.driver.id, name: request.driver.name }),
          },
        ]),
      onError: (error) => Alert.alert('Could not approve', getErrorMessage(error)),
    });

  const handleDecline = (request: LinkRequestResponse) =>
    Alert.alert('Decline request?', `${request.driver.name} will not join your fleet.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () =>
          reject.mutate(request.request_id, {
            onError: (error) => Alert.alert('Could not decline', getErrorMessage(error)),
          }),
      },
    ]);

  const handleRemove = (member: FleetMemberResponse) => {
    const isInvited = Boolean(member.invite_id);
    Alert.alert(
      isInvited ? 'Cancel this invite?' : 'Remove from fleet?',
      isInvited
        ? `${member.name} will not join your fleet.`
        : `${member.name} will leave your fleet.`,
      [
        { text: isInvited ? 'Keep invite' : 'Cancel', style: 'cancel' },
        {
          text: isInvited ? 'Cancel invite' : 'Remove',
          style: 'destructive',
          onPress: () =>
            remove.mutate(member.invite_id ?? member.id, {
              onError: (error) =>
                Alert.alert('Could not remove the driver', getErrorMessage(error)),
            }),
        },
      ],
    );
  };

  const assignTo = (driver: AssignTarget, vehicleId: string) =>
    assign.mutate(
      { vehicleId, body: { driver_id: driver.id } },
      {
        onSuccess: () => Alert.alert('Driver assigned', `${driver.name} now has this vehicle.`),
        onError: (error) => Alert.alert('Could not assign the driver', getErrorMessage(error)),
      },
    );

  const vehicleOptions: DriverOption[] = assigning
    ? vehicles.map((vehicle) => ({
        key: vehicle.id,
        icon: 'box.truck.fill',
        title: `${vehicle.plateNumber} · ${vehicle.model}`,
        detail: vehicle.driver
          ? `Replaces ${vehicle.driver.isOwnerSelf ? 'you' : vehicle.driver.name}`
          : 'No driver',
        onPress: () => {
          setAssigning(null);
          assignTo(assigning, vehicle.id);
        },
      }))
    : [];

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <AppScrollView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        contentContainerClassName="gap-4 px-5 pb-20"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refresh(reload)} />
        }
      >
        <AppView row className="min-h-[44px] items-center justify-between">
          <LiquidGlassBackButton onPress={() => goBack(router)} />
          <AppText className="text-[20px] font-black text-foreground">Drivers</AppText>
          <AppView className="w-10" />
        </AppView>

        {drivers.isLoading || requests.isLoading ? <AppSpinner /> : null}

        {failure ? (
          <AppView className="items-center gap-3 rounded-3xl border border-border bg-card p-5">
            <AppText className="text-center text-[13px] text-muted">
              {getErrorMessage(failure)}
            </AppText>
            <Button variant="outline" size="sm" label="Try again" onPress={() => void reload()} />
          </AppView>
        ) : null}

        {pending.length > 0 ? (
          <AppView className="gap-3">
            <AppText className="px-1 text-[18px] font-extrabold text-foreground">
              Requests to join
            </AppText>
            {pending.map((request) => (
              <JoinRequestCard
                key={request.request_id}
                request={request}
                busy={busy}
                onApprove={() => handleApprove(request)}
                onDecline={() => handleDecline(request)}
              />
            ))}
          </AppView>
        ) : null}

        {members.map((member) => (
          <FleetMemberCard
            key={member.id}
            member={member}
            busy={busy}
            onAssign={() => startAssigning(member)}
            onRemove={() => handleRemove(member)}
          />
        ))}

        {drivers.isSuccess && members.length === 0 && pending.length === 0 ? (
          <AppView className="rounded-3xl border border-dashed border-border bg-card p-6">
            <AppText className="text-center text-[15px] font-bold text-foreground">
              No drivers yet
            </AppText>
            <AppText className="mt-1 text-center text-[13px] leading-5 text-muted">
              Add a driver from one of your vehicles. A driver who already uses Ryno asks to join
              from their own app, and the request shows here.
            </AppText>
          </AppView>
        ) : null}

        <DriverOptionsSheet
          visible={assigning !== null}
          title={`Vehicle for ${assigning?.name ?? ''}`}
          options={vehicleOptions}
          busy={assign.isPending}
          onClose={() => setAssigning(null)}
        />
      </AppScrollView>
    </AppView>
  );
}
