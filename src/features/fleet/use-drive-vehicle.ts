import { useState } from 'react';
import { Alert } from 'react-native';

import { getErrorMessage } from '@/lib/api/api-error';
import { useAssignFleetDriver } from '@/hooks/use-fleet';

import type { FleetVehicle } from './types';

/**
 * Puts the fleet owner on a vehicle as its driver. The backend allows one driver per vehicle and one
 * vehicle per driver, so this also moves the owner off whatever they drove before.
 */
export function useDriveVehicle() {
  const assignDriver = useAssignFleetDriver();
  const [assigningVehicleId, setAssigningVehicleId] = useState<string | null>(null);

  /** Resolves true when the owner now drives `vehicle`; false (after an alert) when the backend refused. */
  const driveVehicle = async (vehicle: Pick<FleetVehicle, 'id'>): Promise<boolean> => {
    setAssigningVehicleId(vehicle.id);
    try {
      await assignDriver.mutateAsync({ vehicleId: vehicle.id, body: { is_owner_self: true } });
      return true;
    } catch (err) {
      Alert.alert('Assignment error', getErrorMessage(err));
      return false;
    } finally {
      setAssigningVehicleId(null);
    }
  };

  return { assigningVehicleId, driveVehicle };
}
