import { Modal } from 'react-native';

import { AppPressable, AppScrollView, AppText, AppView, Button, Icon } from '@/components/ui';

import type { PartnerVehicle } from '@/lib/api/onboarding';

import { vehicleDocumentsReady, type FleetVehicle } from '../types';

export interface DriveVehiclePickerProps {
  visible: boolean;
  vehicles: FleetVehicle[];
  /** Id of the vehicle being assigned right now; its row shows a pending state. */
  assigningVehicleId?: string | null;
  onSelect: (vehicle: FleetVehicle) => void;
  /** The vehicle used to go online now (the driver profile's vehicle). */
  activeVehicleId?: string | null;
  /** The owner's own (non-fleet) vehicles they are approved to drive. */
  ownVehicles?: PartnerVehicle[];
  onSelectOwn?: (vehicleId: string) => void;
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
  activeVehicleId = null,
  ownVehicles = [],
  onSelectOwn,
  onAddVehicle,
  onClose,
  title = 'Which vehicle will you drive?',
  subtitle = 'Choose one of your verified vehicles that has no driver yet.',
}: DriveVehiclePickerProps) {
  // The owner can hold one fleet vehicle and their own vehicles at once; the active one is in use.
  const isActive = (id: string) =>
    activeVehicleId != null
      ? id === activeVehicleId
      : vehicles.some((v) => v.id === id && v.driver?.isOwnerSelf);
  const drivingFleet = vehicles.find(
    (vehicle) => vehicle.driver?.isOwnerSelf && isActive(vehicle.id),
  );
  const drivingOwn = ownVehicles.find((vehicle) => isActive(vehicle.id));
  const current = drivingFleet
    ? {
        name: `${drivingFleet.make} ${drivingFleet.model}`,
        detail: `${drivingFleet.plateNumber} • ${drivingFleet.vehicleTypeName}`,
      }
    : drivingOwn
      ? {
          name: [drivingOwn.make, drivingOwn.model].filter(Boolean).join(' ') || 'Your vehicle',
          detail: `${drivingOwn.registration_number} • Your vehicle`,
        }
      : null;
  const freeVehicles = vehicles.filter(
    (vehicle) => isFree(vehicle) || (vehicle.driver?.isOwnerSelf && !isActive(vehicle.id)),
  );
  const otherOwn = ownVehicles.filter((vehicle) => !isActive(vehicle.id));
  const unverifiedVehicles = vehicles.filter(needsVerification);
  const takenVehicles = vehicles.filter(
    (vehicle) => vehicle.driver != null && !vehicle.driver.isOwnerSelf,
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

          {/* Sized to its content: the sheet has no fixed height, so flex-1 would collapse it. */}
          <AppScrollView className="flex-initial" showsVerticalScrollIndicator={false}>
            <AppView className="gap-2.5">
              {current ? (
                <AppView className="flex-row items-center justify-between rounded-2xl border border-[#FF5722]/40 bg-[#FF5722]/10 p-3.5">
                  <AppView className="flex-1 pr-3">
                    <AppText className="text-[15px] font-bold text-foreground">
                      {current.name}
                    </AppText>
                    <AppText className="mt-0.5 text-[12px] text-muted">{current.detail}</AppText>
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

              {otherOwn.map((vehicle) => (
                <AppPressable
                  key={vehicle.id}
                  onPress={() => onSelectOwn?.(vehicle.id)}
                  disabled={isBusy || !onSelectOwn}
                  pressScale={0.98}
                  className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-3.5 active:bg-neutral-100 dark:active:bg-neutral-800"
                >
                  <AppView className="flex-1 pr-3">
                    <AppText className="text-[15px] font-bold text-foreground">
                      {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Your vehicle'}
                    </AppText>
                    <AppText className="mt-0.5 text-[12px] text-muted">
                      {vehicle.registration_number} • Your vehicle
                    </AppText>
                  </AppView>
                  <AppText className="text-[13px] font-bold text-[#FF5722]">
                    {assigningVehicleId === vehicle.id ? 'Switching…' : 'Drive this'}
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
                      {vehicle.driver?.name}
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
