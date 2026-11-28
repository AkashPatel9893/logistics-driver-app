import { Alert } from 'react-native';

import { AppPressable, AppText, AppView } from '@/components/ui';
import { useSwitchVehicle } from '@/hooks/use-driver';
import { getErrorMessage } from '@/lib/api/api-error';
import type { PartnerVehicle } from '@/lib/api/onboarding';

export interface OtherVehiclesCardProps {
  /** The driver's vehicles apart from the one in use. */
  vehicles: PartnerVehicle[];
}

const ownerLabel = (vehicle: PartnerVehicle) =>
  vehicle.relationship_type === 'FLEET_DRIVER'
    ? (vehicle.fleet?.company_name ?? 'Fleet vehicle')
    : 'Your vehicle';

/** Lets a rider with more than one vehicle choose which to drive. */
export function OtherVehiclesCard({ vehicles }: OtherVehiclesCardProps) {
  const switchVehicle = useSwitchVehicle();
  if (vehicles.length === 0) return null;

  const confirmSwitch = (vehicle: PartnerVehicle) =>
    Alert.alert(
      `Use ${vehicle.registration_number}?`,
      'New delivery requests will be for this vehicle. You can switch back here.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use it',
          onPress: () =>
            switchVehicle.mutate(vehicle.id, {
              onError: (error) => Alert.alert('Could not switch vehicle', getErrorMessage(error)),
            }),
        },
      ],
    );

  return (
    <AppView className="gap-3 rounded-3xl border border-border bg-card p-4">
      <AppText className="text-[15px] font-extrabold text-foreground">Other vehicles</AppText>
      {vehicles.map((vehicle) => (
        <AppView
          key={vehicle.id}
          row
          className="items-center justify-between gap-3 border-t border-border/60 pt-3"
        >
          <AppView className="flex-1">
            <AppText className="text-[15px] font-bold text-foreground">
              {vehicle.registration_number}
            </AppText>
            <AppText className="text-[12px] text-muted">{ownerLabel(vehicle)}</AppText>
          </AppView>
          {vehicle.assignment_status === 'ACTIVE' ? (
            <AppPressable
              onPress={() => confirmSwitch(vehicle)}
              disabled={switchVehicle.isPending}
              hitSlop={10}
              accessibilityRole="button"
            >
              <AppText className="text-[13px] font-bold text-brand">
                {switchVehicle.isPending ? 'Switching...' : 'Use this vehicle'}
              </AppText>
            </AppPressable>
          ) : (
            <AppText className="text-[12px] font-bold text-amber-700 dark:text-amber-400">
              Waiting for Ryno approval
            </AppText>
          )}
        </AppView>
      ))}
    </AppView>
  );
}
