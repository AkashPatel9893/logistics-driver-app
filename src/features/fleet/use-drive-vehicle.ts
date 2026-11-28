import { useState } from 'react';
import { Alert } from 'react-native';

import { getErrorMessage } from '@/lib/api/api-error';
import { useSwitchVehicle } from '@/hooks/use-driver';
import { useAssignFleetDriver } from '@/hooks/use-fleet';

import type { FleetVehicle } from './types';

/**
 * Puts the fleet owner on a vehicle as its driver. The backend allows one driver per fleet vehicle and
 * one fleet vehicle per driver, so assigning also moves the owner off the fleet vehicle they drove before.
 * The owner can also keep their own (non-fleet) vehicle: the backend then holds both, and only the
 * "active" one (POST /partner/active-vehicle) is used to go online. So every choice ends by making the
 * chosen vehicle the active one.
 */
export function useDriveVehicle() {
  const assignDriver = useAssignFleetDriver();
  const switchVehicle = useSwitchVehicle();
  const [assigningVehicleId, setAssigningVehicleId] = useState<string | null>(null);

  const run = async (vehicleId: string, assign: boolean): Promise<boolean> => {
    setAssigningVehicleId(vehicleId);
    try {
      // Self-assigning also makes the vehicle the active one (see useAssignFleetDriver).
      if (assign) await assignDriver.mutateAsync({ vehicleId, body: { is_owner_self: true } });
      else await switchVehicle.mutateAsync(vehicleId);
      return true;
    } catch (err) {
      Alert.alert('Could not change vehicle', getErrorMessage(err));
      return false;
    } finally {
      setAssigningVehicleId(null);
    }
  };

  /** Resolves true when the owner now drives this fleet vehicle; false (after an alert) when refused. */
  const driveVehicle = (
    vehicle: Pick<FleetVehicle, 'id'> & Partial<Pick<FleetVehicle, 'driver'>>,
  ) => run(vehicle.id, !vehicle.driver?.isOwnerSelf);

  /** Back to one of the owner's own vehicles (no fleet assignment needed). */
  const driveOwnVehicle = (vehicleId: string) => run(vehicleId, false);

  return { assigningVehicleId, driveVehicle, driveOwnVehicle };
}
