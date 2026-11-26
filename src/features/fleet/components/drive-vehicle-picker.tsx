import { Modal } from 'react-native';

import { AppPressable, AppScrollView, AppText, AppView, Button, Icon } from '@/components/ui';

import { vehicleDocumentsReady, type FleetVehicle } from '../types';

export interface DriveVehiclePickerProps {
  visible: boolean;
  vehicles: FleetVehicle[];
  /** Id of the vehicle being assigned right now; its row shows a pending state. */
  assigningVehicleId?: string | null;
  onSelect: (vehicle: FleetVehicle) => void;
  onAddVehicle: () => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

/** The vehicles the owner can drive: no driver yet, and the vehicle's documents verified. */
const isFree = (vehicle: FleetVehicle) => vehicle.driver == null && vehicleDocumentsReady(vehicle);
const needsVerification = (vehicle: FleetVehicle) =>
  vehicle.driver == null && !vehicleDocumentsReady(vehicle);

export function DriveVehiclePicker({
  visible,
  vehicles,
  assigningVehicleId = null,
  onSelect,
  onAddVehicle,
  onClose,
  title = 'Which vehicle will you drive?',
  subtitle = 'Choose one of your verified vehicles that has no driver yet.',
}: DriveVehiclePickerProps) {
  const drivingVehicle = vehicles.find((vehicle) => vehicle.driver?.isOwnerSelf);
  const freeVehicles = vehicles.filter(isFree);
  const unverifiedVehicles = vehicles.filter(needsVerification);
  const takenVehicles = vehicles.filter(
    (vehicle) => vehicle.driver != null && vehicle.id !== drivingVehicle?.id,
  );
  const isBusy = assigningVehicleId != null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <AppPressable
        onPress={onClose}
        accessibilityLabel="Close"
        className="flex-1 justify-end bg-black/40"
      >
        <AppPressable
          // Swallow presses so tapping inside the sheet does not close it.
          onPress={() => {}}
          pressScale={1}
          className="max-h-[80%] rounded-t-3xl bg-background px-5 pb-8 pt-5"
        >
          <AppText className="text-[18px] font-extrabold text-foreground">{title}</AppText>
          <AppText className="mb-4 mt-1 text-[13px] text-muted">{subtitle}</AppText>

          <AppScrollView showsVerticalScrollIndicator={false}>
            <AppView className="gap-2.5">
              {drivingVehicle ? (
                <AppView className="flex-row items-center justify-between rounded-2xl border border-[#FF5722]/40 bg-[#FF5722]/10 p-3.5">
                  <AppView className="flex-1 pr-3">
                    <AppText className="text-[15px] font-bold text-foreground">
                      {drivingVehicle.make} {drivingVehicle.model}
                    </AppText>
                    <AppText className="mt-0.5 text-[12px] text-muted">
                      {drivingVehicle.plateNumber} • {drivingVehicle.vehicleTypeName}
                    </AppText>
                  </AppView>
                  <AppText className="text-[13px] font-bold text-[#FF5722]">
                    You&apos;re driving this
                  </AppText>
                </AppView>
              ) : null}
              {freeVehicles.map((vehicle) => (
                <AppPressable
                  key={vehicle.id}
                  onPress={() => onSelect(vehicle)}
                  disabled={isBusy}
                  pressScale={0.98}
                  className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-3.5 active:bg-neutral-100 dark:active:bg-neutral-800"
                >
                  <AppView className="flex-1 pr-3">
                    <AppText className="text-[15px] font-bold text-foreground">
                      {vehicle.make} {vehicle.model}
                    </AppText>
                    <AppText className="mt-0.5 text-[12px] text-muted">
                      {vehicle.plateNumber} • {vehicle.vehicleTypeName}
                    </AppText>
                  </AppView>
                  <AppText className="text-[13px] font-bold text-[#FF5722]">
                    {assigningVehicleId === vehicle.id ? 'Assigning…' : 'Drive this'}
                  </AppText>
                </AppPressable>
              ))}

              <AppPressable
                onPress={onAddVehicle}
                disabled={isBusy}
                pressScale={0.98}
                className="flex-row items-center gap-3 rounded-2xl border border-dashed border-[#FF5722]/50 bg-[#FF5722]/5 p-3.5"
              >
                <Icon name="plus" size={18} tone="brand" />
                <AppText className="text-[14px] font-bold text-[#FF5722]">
                  Add a new vehicle
                </AppText>
              </AppPressable>
            </AppView>

            {unverifiedVehicles.length > 0 ? (
              <AppView className="mt-5 gap-2">
                <AppText className="px-1 text-[12px] font-bold uppercase text-muted">
                  Verify documents first
                </AppText>
                {unverifiedVehicles.map((vehicle) => (
                  <AppView
                    key={vehicle.id}
                    accessibilityState={{ disabled: true }}
                    className="flex-row items-center justify-between rounded-2xl bg-surface-muted p-3.5 opacity-70"
                  >
                    <AppView className="flex-1 pr-3">
                      <AppText className="text-[14px] font-semibold text-foreground">
                        {vehicle.make} {vehicle.model}
                      </AppText>
                      <AppText className="mt-0.5 text-[12px] text-muted">
                        {vehicle.plateNumber}
                      </AppText>
                    </AppView>
                    <AppText className="text-[12px] font-semibold text-muted">Not verified</AppText>
                  </AppView>
                ))}
              </AppView>
            ) : null}

            {takenVehicles.length > 0 ? (
              <AppView className="mt-5 gap-2">
                <AppText className="px-1 text-[12px] font-bold uppercase text-muted">
                  Already has a driver
                </AppText>
                {takenVehicles.map((vehicle) => (
                  <AppView
                    key={vehicle.id}
                    accessibilityState={{ disabled: true }}
                    className="flex-row items-center justify-between rounded-2xl bg-surface-muted p-3.5 opacity-70"
                  >
                    <AppView className="flex-1 pr-3">
                      <AppText className="text-[14px] font-semibold text-foreground">
                        {vehicle.make} {vehicle.model}
                      </AppText>
                      <AppText className="mt-0.5 text-[12px] text-muted">
                        {vehicle.plateNumber}
                      </AppText>
                    </AppView>
                    <AppText className="text-[12px] font-semibold text-muted" numberOfLines={1}>
                      {vehicle.driver?.isOwnerSelf ? 'You' : vehicle.driver?.name}
                    </AppText>
                  </AppView>
                ))}
              </AppView>
            ) : null}
          </AppScrollView>

          <Button variant="outline" label="Cancel" className="mt-4" onPress={onClose} />
        </AppPressable>
      </AppPressable>
    </Modal>
  );
}
