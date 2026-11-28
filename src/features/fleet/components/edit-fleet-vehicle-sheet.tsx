import { useState } from 'react';
import { Modal } from 'react-native';

import {
  AppKeyboardAvoidingView,
  AppPressable,
  AppText,
  AppView,
  Button,
  TextField,
} from '@/components/ui';
import { useUpdateFleetVehicle } from '@/hooks/use-fleet';
import { ApiError, getErrorMessage } from '@/lib/api/api-error';
import type { FleetVehicleUpdateRequest } from '@/lib/api/fleet';
import type { FuelType } from '@/lib/api/models';

import type { FleetVehicle } from '../types';

const FUEL_TYPES: FuelType[] = ['PETROL', 'DIESEL', 'CNG', 'ELECTRIC'];

export interface EditFleetVehicleSheetProps {
  visible: boolean;
  vehicle: FleetVehicle;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Make, model and fuel type: the only details the backend lets an owner change. Mount it only while
 * open, so each opening starts from the saved values.
 */
export function EditFleetVehicleSheet({
  visible,
  vehicle,
  onClose,
  onSaved,
}: EditFleetVehicleSheetProps) {
  const update = useUpdateFleetVehicle();
  const [make, setMake] = useState(vehicle.make);
  const [model, setModel] = useState(vehicle.model);
  const [fuel, setFuel] = useState(vehicle.fuelType ?? '');
  const [error, setError] = useState<string>();

  const handleSave = () => {
    if (!make.trim() || !model.trim()) return setError('Enter the make and model.');
    const body: FleetVehicleUpdateRequest = {};
    if (make.trim() !== vehicle.make) body.make = make.trim();
    if (model.trim() !== vehicle.model) body.model = model.trim();
    if (fuel && fuel !== vehicle.fuelType) body.fuel_type = fuel as FuelType;
    if (Object.keys(body).length === 0) return onClose();
    setError(undefined);
    update.mutate(
      { vehicleId: vehicle.id, body },
      {
        onSuccess: onSaved,
        onError: (e) =>
          setError(
            e instanceof ApiError && e.code === 'VEHICLE_DETAILS_LOCKED'
              ? 'These details are locked because the RC is verified.'
              : getErrorMessage(e),
          ),
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* A short form: a plain view (a scroll view here collapses to no height), kept above the
          keyboard. */}
      <AppKeyboardAvoidingView className="justify-end bg-black/40">
        <AppView className="rounded-t-3xl bg-background px-5 pb-8 pt-5">
          <AppText className="text-[18px] font-extrabold text-foreground">Edit vehicle</AppText>
          <AppText className="mb-4 mt-1 text-[13px] text-muted">
            {`${vehicle.plateNumber} · ${vehicle.vehicleTypeName}. To change the number or type, remove the vehicle and add it again.`}
          </AppText>

          <AppView className="gap-4">
            <TextField
              variant="outlined"
              label="Make"
              placeholder="e.g. Tata"
              value={make}
              onChangeText={setMake}
              maxLength={100}
            />
            <TextField
              variant="outlined"
              label="Model"
              placeholder="e.g. Ace Gold"
              value={model}
              onChangeText={setModel}
              maxLength={100}
            />
            <AppView className="gap-2">
              <AppText className="text-[13px] font-semibold text-foreground-secondary">
                Fuel type
              </AppText>
              <AppView row className="flex-wrap gap-2">
                {FUEL_TYPES.map((option) => (
                  <AppPressable
                    key={option}
                    onPress={() => setFuel(option)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: fuel === option }}
                    className={`rounded-xl border px-3 py-2 ${fuel === option ? 'border-brand bg-brand' : 'border-border bg-card'}`}
                  >
                    <AppText
                      className={
                        fuel === option ? 'font-bold text-brand-foreground' : 'text-foreground'
                      }
                    >
                      {option}
                    </AppText>
                  </AppPressable>
                ))}
              </AppView>
            </AppView>
            {error ? (
              <AppText className="text-[13px] font-medium text-error">{error}</AppText>
            ) : null}
          </AppView>

          <Button
            variant="brand"
            label={update.isPending ? 'Saving…' : 'Save'}
            className="mt-4"
            size="lg"
            disabled={update.isPending}
            loading={update.isPending}
            onPress={handleSave}
          />
          <Button
            variant="outline"
            label="Cancel"
            className="mt-2"
            disabled={update.isPending}
            onPress={onClose}
          />
        </AppView>
      </AppKeyboardAvoidingView>
    </Modal>
  );
}
