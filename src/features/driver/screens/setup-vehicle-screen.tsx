import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Keyboard } from 'react-native';

import {
  AppKeyboardAvoidingView,
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  Button,
  Icon,
  TextField,
} from '@/components/ui';
import { useDriverProfile, useVehicleTypes } from '@/hooks/use-driver';
import { useAddFleetVehicle, useFleetCompany, useRequestFleetLink } from '@/hooks/use-fleet';
import type { FleetDriver } from '@/features/fleet/types';
import type { FuelType } from '@/lib/api/models';

import { SetupScreenLayout } from '../components/setup-screen-layout';

const CAPACITIES = [
  { value: 500, label: '500 kg' },
  { value: 600, label: '600 kg' },
  { value: 750, label: '750 kg' },
  { value: 1000, label: '1 Ton (1000 kg)' },
  { value: 1500, label: '1.5 Ton (1500 kg)' },
  { value: 2000, label: '2 Ton (2000 kg)' },
];

export function SetupVehicleScreen() {
  const router = useRouter();
  const { data: profile } = useDriverProfile();
  const { data: vehicleTypes = [] } = useVehicleTypes();
  const addFleetVehicle = useAddFleetVehicle();
  const requestFleetLink = useRequestFleetLink();
  const { data: company } = useFleetCompany();

  const current = profile?.vehicle ?? null;

  const [ownershipType, setOwnershipType] = useState<'OWN' | 'FLEET'>('OWN');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const [typeId, setTypeId] = useState(current?.vehicleTypeId ?? (vehicleTypes[0]?.id || ''));
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [plateNumber, setPlateNumber] = useState(current?.plateNumber ?? '');
  const [capacityKg, setCapacityKg] = useState<number | null>(null);
  const [showCapacityPicker, setShowCapacityPicker] = useState(false);
  const [fuelType, setFuelType] = useState<FuelType | null>(null);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');

  // Driver Assignment
  const [assignedDriver, setAssignedDriver] = useState<FleetDriver | null>(null);
  const [showDriverChoiceModal, setShowDriverChoiceModal] = useState(false);
  const [error, setError] = useState<string>();

  const selectedType = vehicleTypes.find((t) => t.id === typeId);

  const handleLinkOwner = async () => {
    const clean = ownerPhone.replace(/[^0-9]/g, '');
    if (clean.length < 10) {
      return setError('Enter a valid 10-digit mobile number for your fleet owner.');
    }
    setError(undefined);
    setIsLinking(true);
    try {
      const res = await requestFleetLink.mutateAsync({
        owner_phone: `+91 ${clean.slice(-10)}`,
      });
      setIsLinking(false);
      Alert.alert(
        'Request Sent to Fleet Owner',
        `We have sent an authorization request to ${res.owner_phone_masked || `+91 ${clean.slice(-10)}`}. Once your fleet owner approves and assigns you a vehicle, you will be notified to start driving!`,
        [
          {
            text: 'Got it',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (err: any) {
      setIsLinking(false);
      const msg = err?.response?.data?.detail || err?.message || 'Failed to send link request.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const handleSelfDrive = () => {
    const selfDriver: FleetDriver = {
      id: 'driver-self',
      name: company?.ownerName || profile?.name || 'Owner',
      phone: company?.phone || profile?.phone || '',
      isOwnerSelf: true,
      aadhaarUploaded: true,
      dlUploaded: true,
    };
    setAssignedDriver(selfDriver);
    setShowDriverChoiceModal(false);
  };

  const handleOpenAddDriver = () => {
    setShowDriverChoiceModal(false);
    router.push('/add-driver' as any);
  };

  const handleSave = async () => {
    const cleanPlate = plateNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (cleanPlate.length < 6) {
      return setError('Enter the registration number as printed on your RC.');
    }
    if (!selectedType || !make.trim() || !model.trim() || !fuelType) {
      return setError('Choose a vehicle type and fuel type, and enter the make and model.');
    }
    setError(undefined);
    const vehicleTypeCode = selectedType.code;

    try {
      await addFleetVehicle.mutateAsync({
        registration_number: cleanPlate,
        vehicle_type_code: vehicleTypeCode,
        make: make.trim(),
        model: model.trim(),
        capacity_kg: capacityKg ?? undefined,
        fuel_type: fuelType,
        assign_driver: assignedDriver?.isOwnerSelf ? { is_owner_self: true } : undefined,
      });

      Alert.alert('Vehicle saved', `Your ${model} (${cleanPlate}) has been added to your fleet.`, [
        {
          text: 'Continue',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Could not add vehicle.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  return (
    <SetupScreenLayout
      title="Add your vehicle"
      subtitle="Tell us about the vehicle you'll use for deliveries."
    >
      <AppKeyboardAvoidingView>
        <AppScrollView
          contentContainerClassName="gap-5 px-5 pb-16 pt-3"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Ownership Mode Selection */}
          <AppView className="gap-2">
            <AppText className="text-[13px] font-semibold text-foreground-secondary">
              Vehicle ownership
            </AppText>
            <AppView row className="gap-3">
              <AppPressable
                onPress={() => setOwnershipType('OWN')}
                className={`flex-1 rounded-2xl border p-3.5 ${
                  ownershipType === 'OWN'
                    ? 'border-[#FF5722] bg-[#FF5722]/5'
                    : 'border-border bg-card'
                }`}
              >
                <AppView row className="items-center justify-between">
                  <Icon
                    name="car.fill"
                    size={20}
                    tone={ownershipType === 'OWN' ? 'brand' : 'foreground'}
                  />
                  {ownershipType === 'OWN' ? <Icon name="check" size={16} tone="brand" /> : null}
                </AppView>
                <AppText className="mt-2 text-[14px] font-bold text-foreground">
                  I own a vehicle
                </AppText>
                <AppText className="mt-0.5 text-[11px] text-muted">Register vehicle & RC</AppText>
              </AppPressable>

              <AppPressable
                onPress={() => setOwnershipType('FLEET')}
                className={`flex-1 rounded-2xl border p-3.5 ${
                  ownershipType === 'FLEET'
                    ? 'border-[#FF5722] bg-[#FF5722]/5'
                    : 'border-border bg-card'
                }`}
              >
                <AppView row className="items-center justify-between">
                  <Icon
                    name="building.2"
                    size={20}
                    tone={ownershipType === 'FLEET' ? 'brand' : 'foreground'}
                  />
                  {ownershipType === 'FLEET' ? <Icon name="check" size={16} tone="brand" /> : null}
                </AppView>
                <AppText className="mt-2 text-[14px] font-bold text-foreground">
                  Drive for Owner
                </AppText>
                <AppText className="mt-0.5 text-[11px] text-muted">Link with fleet owner</AppText>
              </AppPressable>
            </AppView>
          </AppView>

          {ownershipType === 'FLEET' ? (
            <AppView className="gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
              <AppView row className="items-center gap-3">
                <AppView className="h-12 w-12 items-center justify-center rounded-2xl bg-[#FF5722]/10">
                  <Icon name="building.2" size={24} tone="brand" />
                </AppView>
                <AppView className="flex-1">
                  <AppText className="text-[16px] font-extrabold text-foreground">
                    Connect with Fleet Owner
                  </AppText>
                  <AppText className="text-[12px] text-muted">
                    Your owner will assign you a vehicle
                  </AppText>
                </AppView>
              </AppView>

              <AppText className="text-[13px] leading-5 text-muted">
                If you are driving for a fleet operator or transport business, enter their
                registered mobile number. Once they approve, their vehicle will be linked to your
                account.
              </AppText>

              <TextField
                label="Fleet Owner's Mobile Number"
                placeholder="e.g. 98765 43210"
                value={ownerPhone}
                onChangeText={setOwnerPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />

              {error ? (
                <AppText className="text-[13px] font-medium text-error">{error}</AppText>
              ) : null}

              <Button
                variant="brand"
                label={isLinking ? 'Sending request...' : 'Send Link Request'}
                disabled={isLinking}
                onPress={handleLinkOwner}
                size="lg"
                textClassName="font-extrabold text-base"
              />
            </AppView>
          ) : (
            <>
              {/* Vehicle type */}
              <AppView>
                <AppText className="mb-2 text-[13px] font-semibold text-foreground-secondary">
                  Vehicle type
                </AppText>
                <AppPressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowTypePicker((prev) => !prev);
                  }}
                  className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800"
                >
                  <AppView row className="items-center gap-3">
                    <Icon name="box.truck" size={20} tone="brand" />
                    <AppText className="text-[15px] font-semibold text-foreground">
                      {selectedType?.name || 'Select vehicle type'}
                    </AppText>
                  </AppView>
                  <Icon
                    name={showTypePicker ? 'chevron.up' : 'chevron.down'}
                    size={18}
                    tone="icon-subtle"
                  />
                </AppPressable>

                {showTypePicker ? (
                  <AppView className="mt-2 rounded-2xl border border-border bg-card p-2 shadow-md">
                    {vehicleTypes.map((type) => (
                      <AppPressable
                        key={type.id}
                        onPress={() => {
                          setTypeId(type.id);
                          setCapacityKg(type.capacityKg);
                          setShowTypePicker(false);
                        }}
                        className={`flex-row items-center justify-between rounded-xl px-3 py-2.5 ${
                          typeId === type.id
                            ? 'bg-[#FF5722]/10'
                            : 'active:bg-neutral-100 dark:active:bg-neutral-800'
                        }`}
                      >
                        <AppText
                          className={`text-[14px] ${
                            typeId === type.id
                              ? 'font-bold text-[#FF5722]'
                              : 'font-medium text-foreground'
                          }`}
                        >
                          {type.name}
                        </AppText>
                        <AppText className="text-[12px] text-muted">
                          {type.capacityKg == null ? '—' : `${type.capacityKg} kg`}
                        </AppText>
                      </AppPressable>
                    ))}
                  </AppView>
                ) : null}
              </AppView>

              {/* Registration number */}
              <AppView>
                <TextField
                  variant="outlined"
                  label="Registration number"
                  required
                  value={plateNumber}
                  onChangeText={(t) => setPlateNumber(t.toUpperCase())}
                  placeholder="e.g. KA 03 MX 2814"
                  autoCapitalize="characters"
                  hint="Enter the number exactly as shown on your RC."
                  leading={<Icon name="tag.fill" size={18} tone="icon-subtle" />}
                  inputClassName="text-[15px]"
                />
              </AppView>

              {/* Vehicle capacity */}
              <AppView>
                <AppText className="mb-2 text-[13px] font-semibold text-foreground-secondary">
                  Vehicle capacity
                </AppText>
                <AppPressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowCapacityPicker((prev) => !prev);
                  }}
                  className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800"
                >
                  <AppView row className="items-center gap-3">
                    <Icon name="scalemass" size={20} tone="icon-subtle" />
                    <AppText className="text-[15px] font-semibold text-foreground">
                      {capacityKg ? `${capacityKg} kg` : 'Select capacity'}
                    </AppText>
                  </AppView>
                  <Icon
                    name={showCapacityPicker ? 'chevron.up' : 'chevron.down'}
                    size={18}
                    tone="icon-subtle"
                  />
                </AppPressable>

                {showCapacityPicker ? (
                  <AppView className="mt-2 rounded-2xl border border-border bg-card p-2 shadow-md">
                    {CAPACITIES.map((cap) => (
                      <AppPressable
                        key={cap.value}
                        onPress={() => {
                          setCapacityKg(cap.value);
                          setShowCapacityPicker(false);
                        }}
                        className={`flex-row items-center justify-between rounded-xl px-3 py-2.5 ${
                          capacityKg === cap.value
                            ? 'bg-[#FF5722]/10'
                            : 'active:bg-neutral-100 dark:active:bg-neutral-800'
                        }`}
                      >
                        <AppText
                          className={`text-[14px] ${
                            capacityKg === cap.value
                              ? 'font-bold text-[#FF5722]'
                              : 'font-medium text-foreground'
                          }`}
                        >
                          {cap.label}
                        </AppText>
                        {capacityKg === cap.value ? (
                          <Icon name="check" size={16} tone="brand" />
                        ) : null}
                      </AppPressable>
                    ))}
                  </AppView>
                ) : null}
              </AppView>

              <TextField
                variant="outlined"
                label="Make"
                required
                value={make}
                onChangeText={setMake}
                placeholder="Enter vehicle make"
              />
              <TextField
                variant="outlined"
                label="Model"
                required
                value={model}
                onChangeText={setModel}
                placeholder="Enter vehicle model"
              />
              <AppView className="gap-2">
                <AppText className="text-[13px] font-semibold text-foreground-secondary">
                  Fuel type
                </AppText>
                <AppView row className="flex-wrap gap-2">
                  {(['PETROL', 'DIESEL', 'CNG', 'ELECTRIC'] as FuelType[]).map((fuel) => (
                    <AppPressable
                      key={fuel}
                      onPress={() => setFuelType(fuel)}
                      className={`rounded-xl border border-border px-3 py-2 ${fuelType === fuel ? 'bg-surface-muted' : 'bg-card'}`}
                    >
                      <AppText>{fuel}</AppText>
                    </AppPressable>
                  ))}
                </AppView>
              </AppView>
              <AppView className="gap-3">
                <AppText className="text-[15px] font-bold text-foreground">
                  Vehicle documents
                </AppText>
                {[
                  { title: 'Upload registration certificate', icon: 'arrow.up.doc' as const },
                  { title: 'Add vehicle photo', icon: 'camera' as const },
                ].map((document) => (
                  <AppView
                    key={document.title}
                    row
                    className="items-center justify-between rounded-2xl border border-dashed border-border bg-card p-4"
                  >
                    <AppView row className="flex-1 items-center gap-3">
                      <AppView className="h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                        <Icon name={document.icon} size={20} tone="brand" />
                      </AppView>
                      <AppView className="flex-1">
                        <AppText className="text-[14px] font-bold text-foreground">
                          {document.title}
                        </AppText>
                        <AppText className="text-[12px] text-muted">Unavailable</AppText>
                      </AppView>
                    </AppView>
                    <AppText className="text-[12px] font-bold text-muted">—</AppText>
                  </AppView>
                ))}
                {/* Add a driver card matching screenshot 1 screen 5 */}
                <AppView className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
                  <AppView row className="items-center justify-between">
                    <AppView row className="flex-1 items-center gap-3">
                      <AppView className="h-12 w-12 items-center justify-center rounded-2xl bg-[#FFEFE9] dark:bg-[#3D1E12]">
                        <Icon name="person.badge.plus" size={22} tone="brand" />
                      </AppView>
                      <AppView className="flex-1 pr-2">
                        <AppText className="text-[16px] font-bold text-foreground">
                          {assignedDriver ? `Driver: ${assignedDriver.name}` : 'Add a driver'}
                        </AppText>
                        <AppText className="text-[12px] text-muted" numberOfLines={1}>
                          {assignedDriver
                            ? assignedDriver.isOwnerSelf
                              ? 'Owner driving myself'
                              : assignedDriver.phone
                            : 'Vehicle type, registration and photos'}
                        </AppText>
                      </AppView>
                    </AppView>
                    <AppView
                      className={`rounded-full px-3 py-1 ${
                        assignedDriver ? 'bg-emerald-500/15' : 'bg-[#F3ECE6] dark:bg-neutral-800'
                      }`}
                    >
                      <AppText
                        className={`text-[11px] font-bold ${
                          assignedDriver
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-[#8C7A6B] dark:text-neutral-300'
                        }`}
                      >
                        {assignedDriver ? 'Assigned' : 'Pending'}
                      </AppText>
                    </AppView>
                  </AppView>

                  <AppPressable
                    onPress={() => setShowDriverChoiceModal(true)}
                    pressScale={0.98}
                    className="mt-3.5 w-full items-center justify-center rounded-full border border-border bg-background py-2.5 active:bg-neutral-100 dark:active:bg-neutral-800"
                  >
                    <AppText className="text-[14px] font-bold text-foreground">
                      {assignedDriver ? 'Change Driver' : 'Add Driver'}
                    </AppText>
                  </AppPressable>
                </AppView>
              </AppView>

              {/* Driver selection modal */}
              {showDriverChoiceModal ? (
                <AppView className="rounded-3xl border border-[#FF5722]/40 bg-card p-5 shadow-lg">
                  <AppText className="text-[16px] font-extrabold text-foreground">
                    Who will drive this vehicle?
                  </AppText>
                  <AppText className="mt-1 text-[13px] text-muted">
                    Owners can drive their own vehicle or add designated drivers:
                  </AppText>

                  <AppView className="mt-4 gap-2.5">
                    <AppPressable
                      onPress={handleSelfDrive}
                      className="flex-row items-center justify-between rounded-2xl border border-border bg-background p-3.5 active:bg-neutral-100 dark:active:bg-neutral-800"
                    >
                      <AppView row className="items-center gap-3">
                        <Icon name="steeringwheel" size={20} tone="brand" />
                        <AppView>
                          <AppText className="text-[14px] font-bold text-foreground">
                            I will drive myself ({company?.ownerName || 'Owner'})
                          </AppText>
                          <AppText className="text-[11px] text-muted">
                            Assign owner self as active driver
                          </AppText>
                        </AppView>
                      </AppView>
                      <Icon name="check" size={18} tone="brand" />
                    </AppPressable>

                    <AppPressable
                      onPress={handleOpenAddDriver}
                      className="flex-row items-center justify-between rounded-2xl border border-border bg-background p-3.5 active:bg-neutral-100 dark:active:bg-neutral-800"
                    >
                      <AppView row className="items-center gap-3">
                        <Icon name="person.badge.plus" size={20} tone="foreground" />
                        <AppView>
                          <AppText className="text-[14px] font-bold text-foreground">
                            Add a new driver
                          </AppText>
                          <AppText className="text-[11px] text-muted">
                            Enter full name, DL, phone number
                          </AppText>
                        </AppView>
                      </AppView>
                      <Icon name="chevron.right" size={16} tone="icon-subtle" />
                    </AppPressable>
                  </AppView>

                  <Button
                    variant="outline"
                    label="Cancel"
                    className="mt-4"
                    onPress={() => setShowDriverChoiceModal(false)}
                  />
                </AppView>
              ) : null}

              {error ? (
                <AppText className="text-[13px] font-medium text-error">{error}</AppText>
              ) : null}

              {/* Save vehicle button */}
              <AppView className="mt-4 gap-3">
                <Button
                  variant="brand"
                  label={addFleetVehicle.isPending ? 'Saving...' : 'Save vehicle'}
                  onPress={handleSave}
                  disabled={addFleetVehicle.isPending}
                  loading={addFleetVehicle.isPending}
                  size="lg"
                  textClassName="font-extrabold text-base"
                />
                <AppText className="text-center text-[12px] text-muted">
                  You can update these details later from your profile.
                </AppText>
              </AppView>
            </>
          )}
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </SetupScreenLayout>
  );
}
