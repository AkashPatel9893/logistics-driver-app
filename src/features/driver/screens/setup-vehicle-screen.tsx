import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, type TextInput } from 'react-native';

import {
  AppKeyboardAvoidingView,
  AppPressable,
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Button,
  Icon,
  TextField,
} from '@/components/ui';
import {
  useDriverProfile,
  useMyVehicles,
  useSaveVehicle,
  useSubmitVehicleDocument,
  useVehicleDocuments,
  useVehicleTypes,
  type VehicleDocumentInfo,
} from '@/hooks/use-driver';
import { useAddFleetVehicle, useFleetVehicles, useRequestFleetLink } from '@/hooks/use-fleet';
import { DriverChoiceSheet } from '@/features/fleet/components';
import { FLEET_VEHICLE_DOCUMENTS_ENABLED } from '@/features/fleet/config';
import { useDriveVehicle } from '@/features/fleet/use-drive-vehicle';
import { useFleetStore } from '@/features/fleet/use-fleet-store';
import { useRegistrationStore } from '@/features/registration/use-registration-store';
import { markSubmitted, useDraftText } from '@/features/registration/drafts';
import { OtherVehiclesCard } from '../components/other-vehicles-card';
import { OtherVehiclePapers } from '../components/other-vehicle-papers';
import { useOnboardingStatus } from '@/features/registration/use-registration';
import { PhotoUploadBox } from '../components/photo-upload-box';
import { useLocalPhoto } from '../hooks/use-local-photo';
import type { DriverProfile, FuelType, VehicleTypeOption } from '@/lib/api/models';
import { ApiError, getErrorMessage } from '@/lib/api/api-error';
import { documentSentMessage, formatDateInput, toIsoDate } from '@/lib/api/onboarding';

import { SetupScreenLayout } from '../components/setup-screen-layout';
import { VehicleImage } from '../components/vehicle-image';
import { goBack } from '@/lib/go-back';
import { goToNextStep } from '@/features/registration/next-step';

const CAPACITIES = [
  { value: 500, label: '500 kg' },
  { value: 600, label: '600 kg' },
  { value: 750, label: '750 kg' },
  { value: 1000, label: '1 Ton (1000 kg)' },
  { value: 1500, label: '1.5 Ton (1500 kg)' },
  { value: 2000, label: '2 Ton (2000 kg)' },
];

/** Capacities a vehicle type can carry: the presets at or below its max payload, plus the max itself. */
function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <AppPressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      className={`rounded-xl border px-4 py-2.5 ${selected ? 'border-brand bg-brand' : 'border-border bg-card'}`}
    >
      <AppText className={selected ? 'font-bold text-brand-foreground' : 'text-foreground'}>
        {label}
      </AppText>
    </AppPressable>
  );
}

function capacityOptionsFor(maxPayloadKg: number | null): { value: number; label: string }[] {
  if (maxPayloadKg == null) return CAPACITIES;
  const options = CAPACITIES.filter((cap) => cap.value < maxPayloadKg);
  options.push({ value: maxPayloadKg, label: `${maxPayloadKg} kg` });
  return options;
}

/** ISO date (YYYY-MM-DD) as the form shows it (DD/MM/YYYY). */
function toFormDate(iso: string | null | undefined): string {
  return iso ? iso.split('-').reverse().join('/') : '';
}

const DOC_LABEL: Record<string, string> = { RC: 'RC', INSURANCE: 'Insurance', PUC: 'PUC' };

function docStatus(status: string): { label: string; className: string } {
  if (status === 'VERIFIED') return { label: 'Verified', className: 'text-emerald-700' };
  if (status === 'REJECTED') return { label: 'Rejected', className: 'text-red-600' };
  return { label: 'In review', className: 'text-amber-700' };
}

/** Waits for the saved details, so the form never opens empty while they are still loading. */
export function SetupVehicleScreen() {
  const { data: profile } = useDriverProfile();
  const { data: vehicleTypes } = useVehicleTypes();
  const savedId = profile?.vehicle?.id;
  const docs = useVehicleDocuments(savedId);
  const waitingForDocs = Boolean(savedId) && docs.isLoading;
  if (!profile || !vehicleTypes || waitingForDocs) {
    return (
      <SetupScreenLayout
        title="Add your vehicle"
        subtitle="Tell us about the vehicle you'll use for deliveries."
      >
        <AppView className="flex-1 items-center justify-center p-6">
          <AppSpinner size="large" />
        </AppView>
      </SetupScreenLayout>
    );
  }
  return (
    <SetupVehicleForm
      // A switch changes the vehicle in use: the form must not keep the other one's details.
      key={savedId ?? 'new'}
      profile={profile}
      vehicleTypes={vehicleTypes}
      vehicleDocs={docs.data ?? []}
    />
  );
}

interface SetupVehicleFormProps {
  profile: DriverProfile;
  vehicleTypes: VehicleTypeOption[];
  vehicleDocs: VehicleDocumentInfo[];
}

function SetupVehicleForm({ profile, vehicleTypes, vehicleDocs }: SetupVehicleFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const addFleetVehicle = useAddFleetVehicle();
  const saveVehicle = useSaveVehicle();
  const isFleetOwner = useFleetStore.use.dashboardRole() === 'owner';
  // A driver's half-filled vehicle form is kept on the phone until saved (fleet owners adding
  // vehicles start fresh each time).
  const draft = (key: string) => (isFleetOwner ? undefined : `vehicle.${key}`);
  const rc = useLocalPhoto(draft('rc'));
  const insurance = useLocalPhoto(draft('insurance'));
  const puc = useLocalPhoto(draft('puc'));
  // What the backend has, to start from when this phone has no draft of its own. A fleet owner
  // adding a fleet vehicle starts empty: the saved vehicle is their personal one.
  const saved = isFleetOwner ? null : (profile.vehicle ?? null);
  const savedExpiry = (type: string) =>
    toFormDate(vehicleDocs.find((d) => d.type === type)?.expiryDate);
  const [insuranceExpiry, setInsuranceExpiry] = useDraftText(
    draft('insuranceExpiry'),
    savedExpiry('INSURANCE'),
  );
  const [pucExpiry, setPucExpiry] = useDraftText(draft('pucExpiry'), savedExpiry('PUC'));
  const requestFleetLink = useRequestFleetLink();

  // The rider's own vehicle. Never for a fleet owner: the one they drive must not prefill a new one.
  const current = saved;

  // Chosen on Select Vehicle ("I drive for a fleet owner"); fleet owners always add their own.
  const fleetDriver = useRegistrationStore.use.fleetDriver();
  // A rider who already has an account joins a fleet from here too.
  const [joiningFleet, setJoiningFleet] = useState(false);
  const ownershipType: 'OWN' | 'FLEET' =
    !isFleetOwner && (fleetDriver || joiningFleet) ? 'FLEET' : 'OWN';
  const [ownerPhone, setOwnerPhone] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // A driver picks the type first on the registration screen; prefill it here.
  const pickedTypeId = useRegistrationStore.use.vehicleTypeId();
  const [typeId, setTypeId] = useState(
    current?.vehicleTypeId ?? (isFleetOwner ? null : pickedTypeId) ?? (vehicleTypes[0]?.id || ''),
  );
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [plateNumber, setPlateNumber] = useDraftText(draft('plate'), current?.plateNumber ?? '');
  // The backend cannot change or remove a driver's vehicle: a new number registers a second
  // vehicle. That is right only to correct a refused one, so otherwise the number is fixed.
  const plateLocked = saved != null && saved.status !== 'rejected';
  const [capacityKg, setCapacityKg] = useState<number | null>(
    vehicleTypes.find((t) => t.id === typeId)?.capacityKg ?? null,
  );
  const [showCapacityPicker, setShowCapacityPicker] = useState(false);
  const [fuelDraft, setFuelDraft] = useDraftText(draft('fuel'), saved?.fuelType ?? '');
  const fuelType = (fuelDraft || null) as FuelType | null;
  const setFuelType = (value: FuelType | null) => setFuelDraft(value ?? '');
  // Who owns it: a rider registering a vehicle someone else owns needs the owner's permission.
  const [ownedBy, setOwnedBy] = useDraftText(draft('ownedBy'), 'self');
  const [ownerKind, setOwnerKind] = useDraftText(draft('ownerKind'), 'INDIVIDUAL');
  const [ownerName, setOwnerName] = useDraftText(draft('ownerName'), '');
  const [vehicleOwnerPhone, setVehicleOwnerPhone] = useDraftText(draft('ownerPhone'), '');
  const asksOwner = !isFleetOwner && ownershipType === 'OWN' && !plateLocked;
  const ownedByOther = asksOwner && ownedBy === 'other';
  const [make, setMake] = useDraftText(draft('make'), saved?.makeName ?? '');
  const [model, setModel] = useDraftText(draft('model'), saved?.modelName ?? '');

  const [error, setError] = useState<string>();
  // Fields left empty on the last save; each one clears itself once filled.
  const [missing, setMissing] = useState<string[]>([]);
  const makeRef = useRef<ComponentRef<typeof TextInput>>(null);
  const modelRef = useRef<ComponentRef<typeof TextInput>>(null);

  // A saved vehicle with all its documents shows as a summary: the fields would only repeat it.
  // They open on request, or at once when something is missing or was refused.
  const [editing, setEditing] = useState(false);
  const requiredDocs = ['RC', 'INSURANCE', ...(saved?.fuelType === 'ELECTRIC' ? [] : ['PUC'])];
  const complete =
    saved != null &&
    saved.status !== 'rejected' &&
    requiredDocs.every((type) =>
      vehicleDocs.some((d) => d.type === type && d.status !== 'PENDING'),
    );
  // A fleet vehicle is read-only here: its owner looks after it and its papers.
  const isFleetVehicle = saved?.isFleet === true;
  const showForm = !isFleetVehicle && (!complete || editing);

  // Fitness and permits: the backend's checklist names them when this vehicle needs them (by type,
  // or fitness for a vehicle over 15 years); the type's flags cover the time before it does.
  const { data: onboardingStatus } = useOnboardingStatus();
  const neededPapers = Object.keys(onboardingStatus?.steps.VEHICLE_DOCUMENTS?.detail ?? {});
  const savedType = vehicleTypes.find((t) => t.id === saved?.vehicleTypeId);
  const submitPaper = useSubmitVehicleDocument(saved?.id);
  const handleSubmitPaper = async (submission: {
    type: string;
    photoUri: string;
    expiryDate?: string;
  }) => {
    try {
      const status = await submitPaper.mutateAsync({
        type: submission.type,
        fileUri: submission.photoUri,
        expiryDate: submission.expiryDate,
      });
      const message = documentSentMessage(status);
      Alert.alert(message.title, message.body);
      return true;
    } catch (err) {
      Alert.alert('Could not send the document', getErrorMessage(err));
      return false;
    }
  };

  const { data: myVehicles = [] } = useMyVehicles({ enabled: !isFleetOwner });
  const otherVehicles = saved ? myVehicles.filter((v) => v.id !== saved.id) : [];
  const hasFleetVehicle = myVehicles.some((v) => v.relationship_type === 'FLEET_DRIVER');
  // A join request this phone sent; forgotten once the owner has given a vehicle.
  const linkRequest = useRegistrationStore.use.fleetLinkRequest();
  useEffect(() => {
    if (hasFleetVehicle && linkRequest) useRegistrationStore.getState().setFleetLinkRequest(null);
  }, [hasFleetVehicle, linkRequest]);

  // Fleet owner: after saving, ask who will drive the new vehicle.
  const { data: fleetVehicles = [] } = useFleetVehicles({ enabled: isFleetOwner });
  const { assigningVehicleId, driveVehicle } = useDriveVehicle();
  const [newVehicle, setNewVehicle] = useState<{ id: string; label: string } | null>(null);
  const [showDriverChoice, setShowDriverChoice] = useState(false);
  const selectedType = vehicleTypes.find((t) => t.id === typeId);
  const maxPayloadKg = selectedType?.capacityKg ?? null;
  const capacityOptions = capacityOptionsFor(maxPayloadKg);

  // Shown on My vehicle and above the request form, so a sent request is never invisible.
  const linkRequestCard = linkRequest ? (
    <AppView className="gap-1 rounded-2xl border border-border bg-card p-4">
      <AppText className="text-[14px] font-bold text-foreground">
        Join request sent to {linkRequest.to}
      </AppText>
      <AppText className="text-[13px] leading-5 text-muted">
        {`Sent ${formatSentDate(linkRequest.sentAt)}. The fleet owner approves it in their Ryno app, then assigns you a vehicle. If nothing happens, call them.`}
      </AppText>
      <AppPressable
        onPress={() => useRegistrationStore.getState().setFleetLinkRequest(null)}
        accessibilityRole="button"
        hitSlop={8}
        className="mt-1 self-start"
      >
        <AppText className="text-[13px] font-bold text-muted underline">Hide</AppText>
      </AppPressable>
    </AppView>
  ) : null;

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
      useRegistrationStore.getState().setFleetLinkRequest({
        to: res.owner_phone_masked || `+91 ${clean.slice(-10)}`,
        sentAt: new Date().toISOString(),
      });
      Alert.alert(
        'Request Sent to Fleet Owner',
        `We have sent an authorization request to ${res.owner_phone_masked || `+91 ${clean.slice(-10)}`}. Once your fleet owner approves and assigns you a vehicle, you will be notified to start driving!`,
        [
          {
            text: 'Got it',
            // Joining from My vehicle is not a sign-up step: return to where the rider came from.
            onPress: () =>
              joiningFleet ? goBack(router) : goToNextStep(router, queryClient, 'vehicle'),
          },
        ],
      );
    } catch (err: any) {
      setIsLinking(false);
      const msg = err?.response?.data?.detail || err?.message || 'Failed to send link request.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const finishAfterSave = () => {
    setShowDriverChoice(false);
    goBack(router);
  };

  const assignOwnerToNewVehicle = async () => {
    if (!newVehicle) return;
    if (await driveVehicle(newVehicle)) finishAfterSave();
  };

  const handleDriveMyself = () => {
    const current = fleetVehicles.find((v) => v.driver?.isOwnerSelf && v.id !== newVehicle?.id);
    if (!current) {
      void assignOwnerToNewVehicle();
      return;
    }
    Alert.alert(
      'Move to this vehicle?',
      `You currently drive ${current.model} (${current.plateNumber}). You can drive one vehicle at a time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Move', onPress: () => void assignOwnerToNewVehicle() },
      ],
    );
  };

  const handleAddDriver = () => {
    setShowDriverChoice(false);
    router.replace({ pathname: '/add-driver' as any, params: { vehicleId: newVehicle?.id } });
  };

  const handleSave = async () => {
    const cleanPlate = (plateLocked && saved ? saved.plateNumber : plateNumber)
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase();
    const empty = [
      cleanPlate.length < 6 && 'plate',
      !selectedType && 'type',
      !make.trim() && 'make',
      !model.trim() && 'model',
      !fuelType && 'fuel',
    ].filter((key): key is string => Boolean(key));
    setMissing(empty);
    if (empty.length > 0) {
      const only: Record<string, string> = {
        plate: 'Enter the registration number as printed on your RC.',
        type: 'Choose the vehicle type.',
        make: 'Enter the make.',
        model: 'Enter the model.',
        fuel: 'Choose the fuel type.',
      };
      return setError(empty.length === 1 ? only[empty[0]] : 'Fill in the fields marked in red.');
    }
    if (!selectedType || !fuelType) return;
    if (!isFleetOwner) {
      const needsPuc = fuelType !== 'ELECTRIC';
      const missingPhotos = [
        !rc.uri && 'RC',
        !insurance.uri && 'insurance',
        needsPuc && !puc.uri && 'PUC',
      ].filter(Boolean);
      if (missingPhotos.length > 0) {
        return setError(`Add a photo of your ${missingPhotos.join(', ')}.`);
      }
      if (!toIsoDate(insuranceExpiry)) {
        return setError('Enter the insurance expiry date as DD/MM/YYYY.');
      }
      if (needsPuc && !toIsoDate(pucExpiry)) {
        return setError('Enter the PUC expiry date as DD/MM/YYYY.');
      }
    }
    const ownerDigits = vehicleOwnerPhone.replace(/\D/g, '').slice(-10);
    if (ownedByOther) {
      if (ownerName.trim().length < 2) {
        return setError(
          ownerKind === 'BUSINESS' ? "Enter the owner's business name." : "Enter the owner's name.",
        );
      }
      if (ownerDigits.length !== 10) return setError("Enter the owner's 10-digit mobile number.");
    }
    const trimmedOwner = ownerName.trim();
    const spaceAt = trimmedOwner.indexOf(' ');
    const owner = ownedByOther
      ? ownerKind === 'BUSINESS'
        ? {
            owner_type: 'BUSINESS' as const,
            business_name: trimmedOwner,
            phone: `+91${ownerDigits}`,
          }
        : {
            owner_type: 'INDIVIDUAL' as const,
            first_name: spaceAt > 0 ? trimmedOwner.slice(0, spaceAt) : trimmedOwner,
            ...(spaceAt > 0 ? { last_name: trimmedOwner.slice(spaceAt + 1).trim() } : {}),
            phone: `+91${ownerDigits}`,
          }
      : undefined;
    setError(undefined);
    const vehicleTypeCode = selectedType.code;
    let created: { id: string } | null = null;

    try {
      let savedProfile: DriverProfile | null = null;
      if (!isFleetOwner) {
        savedProfile = await saveVehicle.mutateAsync({
          vehicleTypeId: selectedType.id,
          plateNumber: cleanPlate,
          make: make.trim(),
          model: model.trim(),
          fuelType,
          rcPhotoUri: rc.uri!,
          insurancePhotoUri: insurance.uri!,
          insuranceExpiry: toIsoDate(insuranceExpiry)!,
          pucPhotoUri: fuelType === 'ELECTRIC' ? null : puc.uri,
          pucExpiry: fuelType === 'ELECTRIC' ? null : toIsoDate(pucExpiry),
          ...(owner ? { owner } : {}),
        });
      } else {
        created = await addFleetVehicle.mutateAsync({
          registration_number: cleanPlate,
          vehicle_type_code: vehicleTypeCode,
          make: make.trim(),
          model: model.trim(),
          capacity_kg:
            capacityKg != null && maxPayloadKg != null
              ? Math.min(capacityKg, maxPayloadKg)
              : (capacityKg ?? undefined),
          fuel_type: fuelType,
        });
      }

      markSubmitted('vehicle.');
      if (owner && savedProfile?.vehicle) {
        // Someone else owns it: their permission (NOC and OTP) comes next.
        router.replace({
          pathname: '/owner-permission' as any,
          params: { vehicleId: savedProfile.vehicle.id },
        });
        return;
      }
      if (!isFleetOwner) {
        // Registering driver: straight on to the next step (Documents shows it under review).
        await goToNextStep(router, queryClient, 'vehicle');
        return;
      }
      if (created && FLEET_VEHICLE_DOCUMENTS_ENABLED) {
        // Its documents come next; a driver can be added once they are verified.
        router.replace({ pathname: '/vehicle-details' as any, params: { vehicleId: created.id } });
      } else if (created) {
        setNewVehicle({ id: created.id, label: `${model.trim()} (${cleanPlate})` });
        setShowDriverChoice(true);
      } else {
        goBack(router);
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'OWNER_PHONE_IS_DRIVER') {
        return setError("That is your own number. If you own the vehicle, choose 'I own it'.");
      }
      if (err instanceof ApiError && err.code === 'VEHICLE_OWNER_MISMATCH') {
        return setError(
          'This vehicle is already registered with a different owner. Check the owner details.',
        );
      }
      const msg = err?.response?.data?.detail || err?.message || 'Could not add vehicle.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  return (
    <SetupScreenLayout
      title={saved ? 'My vehicle' : 'Add your vehicle'}
      subtitle={
        saved
          ? 'Your vehicle and its documents'
          : isFleetOwner
            ? 'Add a vehicle to your fleet.'
            : "Tell us about the vehicle you'll use for deliveries."
      }
    >
      <AppKeyboardAvoidingView>
        <AppScrollView
          contentContainerClassName="gap-5 px-5 pb-16 pt-3"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {saved ? (
            <AppView className="gap-3 rounded-3xl border border-border bg-card p-4">
              <AppText className="text-[15px] font-extrabold text-foreground">
                {saved.isFleet ? (saved.fleetName ?? 'Fleet vehicle') : 'Saved vehicle'}
              </AppText>
              <AppView row className="items-center gap-3">
                <VehicleImage
                  imageUrl={null}
                  type={
                    vehicleTypes.find((t) => t.id === saved.vehicleTypeId)?.code ??
                    saved.vehicleTypeName
                  }
                  className="h-12 w-16"
                />
                <AppView className="flex-1">
                  <AppText className="text-[15px] font-bold text-foreground">
                    {saved.plateNumber}
                  </AppText>
                  <AppText className="text-[12px] text-muted">
                    {[saved.vehicleTypeName, saved.model, saved.fuelType]
                      .filter(Boolean)
                      .join(' · ')}
                  </AppText>
                </AppView>
              </AppView>
              {vehicleDocs
                .filter((d) => d.type in DOC_LABEL)
                .map((d) => {
                  const status = docStatus(d.status);
                  return (
                    <AppView
                      key={d.type}
                      row
                      className="items-center justify-between border-t border-border/60 pt-2.5"
                    >
                      <AppText className="text-[13px] text-foreground">
                        {DOC_LABEL[d.type] ?? d.type}
                        {d.expiryDate ? ` · valid till ${toFormDate(d.expiryDate)}` : ''}
                      </AppText>
                      <AppText className={`text-[12px] font-bold ${status.className}`}>
                        {status.label}
                      </AppText>
                    </AppView>
                  );
                })}
              {isFleetVehicle ? (
                <AppText className="text-[12px] leading-5 text-muted">
                  Your fleet owner looks after this vehicle and its papers.
                </AppText>
              ) : null}
              {showForm ? (
                <AppText className="text-[12px] leading-5 text-muted">
                  The photos you sent are kept safely and not shown again. Add new ones only to
                  replace them.
                </AppText>
              ) : null}
            </AppView>
          ) : null}
          {saved && !isFleetVehicle ? (
            <OtherVehiclePapers
              needFitness={neededPapers.includes('FITNESS') || savedType?.requiresFitness === true}
              needPermit={
                neededPapers.some((key) => key.includes('PERMIT')) ||
                savedType?.requiresPermit === true
              }
              papers={vehicleDocs}
              submitting={submitPaper.isPending}
              note="Ryno checks it, usually within a day. You can go online once it is verified."
              onSubmit={handleSubmitPaper}
            />
          ) : null}
          {!isFleetOwner ? <OtherVehiclesCard vehicles={otherVehicles} /> : null}
          {!showForm && !joiningFleet ? (
            <AppView className="gap-3">
              {!isFleetVehicle ? (
                <Button variant="outline" label="Update vehicle" onPress={() => setEditing(true)} />
              ) : null}
              {!isFleetOwner && !hasFleetVehicle ? linkRequestCard : null}
              {!isFleetOwner && !hasFleetVehicle ? (
                <Button
                  variant="ghost"
                  label="I drive for a fleet owner"
                  onPress={() => setJoiningFleet(true)}
                />
              ) : null}
            </AppView>
          ) : ownershipType === 'FLEET' ? (
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

              {linkRequestCard}

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
              {/* Vehicle type: a driver already picked it on Select Vehicle */}
              {!isFleetOwner && selectedType ? (
                <AppView
                  row
                  className="items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3.5"
                >
                  <AppView row className="items-center gap-3">
                    <VehicleImage
                      imageUrl={selectedType.imageUrl}
                      type={selectedType.code || selectedType.name}
                      className="h-10 w-14"
                    />
                    <AppView>
                      <AppText className="text-[12px] text-muted">Vehicle type</AppText>
                      <AppText className="text-[15px] font-bold text-foreground">
                        {selectedType.name}
                      </AppText>
                    </AppView>
                  </AppView>
                  {current ? null : (
                    <AppPressable onPress={() => router.push('/register-vehicle-type')} hitSlop={8}>
                      <AppText className="text-[13px] font-bold text-[#2563eb]">Change</AppText>
                    </AppPressable>
                  )}
                </AppView>
              ) : (
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
                      {selectedType ? (
                        <VehicleImage
                          imageUrl={selectedType.imageUrl}
                          type={selectedType.code || selectedType.name}
                          className="h-10 w-14"
                        />
                      ) : (
                        <Icon name="box.truck" size={20} tone="brand" />
                      )}
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
                          <AppView row className="flex-1 items-center gap-3">
                            <VehicleImage
                              imageUrl={type.imageUrl}
                              type={type.code || type.name}
                              className="h-9 w-12"
                            />
                            <AppText
                              className={`text-[14px] ${
                                typeId === type.id
                                  ? 'font-bold text-[#FF5722]'
                                  : 'font-medium text-foreground'
                              }`}
                            >
                              {type.name}
                            </AppText>
                          </AppView>
                          <AppText className="text-[12px] text-muted">
                            {type.capacityKg == null ? '—' : `${type.capacityKg} kg`}
                          </AppText>
                        </AppPressable>
                      ))}
                    </AppView>
                  ) : null}
                </AppView>
              )}

              {/* Registration number */}
              <AppView>
                <TextField
                  variant="outlined"
                  label="Registration number"
                  required
                  value={plateLocked && saved ? saved.plateNumber : plateNumber}
                  onChangeText={(t) => setPlateNumber(t.toUpperCase())}
                  editable={!plateLocked}
                  placeholder="e.g. KA 03 MX 2814"
                  autoCapitalize="characters"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => makeRef.current?.focus()}
                  error={
                    missing.includes('plate') &&
                    plateNumber.replace(/[^A-Z0-9]/gi, '').length < 6 &&
                    !plateLocked
                      ? 'Enter the number as printed on the RC'
                      : undefined
                  }
                  hint={
                    plateLocked
                      ? 'The number cannot be changed. To use another vehicle, contact support.'
                      : 'Enter the number exactly as shown on your RC.'
                  }
                  leading={<Icon name="tag.fill" size={18} tone="icon-subtle" />}
                  inputClassName="text-[15px]"
                />
              </AppView>

              {asksOwner ? (
                <AppView className="gap-3">
                  <AppText className="text-[13px] font-semibold text-foreground-secondary">
                    Who owns this vehicle?
                  </AppText>
                  <AppView row className="gap-2">
                    {[
                      { value: 'self', label: 'I own it' },
                      { value: 'other', label: 'Someone else' },
                    ].map((option) => (
                      <Chip
                        key={option.value}
                        label={option.label}
                        selected={ownedBy === option.value}
                        onPress={() => setOwnedBy(option.value)}
                      />
                    ))}
                  </AppView>
                  {ownedByOther ? (
                    <>
                      <AppText className="text-[12px] text-muted">
                        After saving, you will need a signed letter (NOC) from the owner and a code
                        sent to their phone.
                      </AppText>
                      <AppView row className="gap-2">
                        {[
                          { value: 'INDIVIDUAL', label: 'A person' },
                          { value: 'BUSINESS', label: 'A business' },
                        ].map((option) => (
                          <Chip
                            key={option.value}
                            label={option.label}
                            selected={ownerKind === option.value}
                            onPress={() => setOwnerKind(option.value)}
                          />
                        ))}
                      </AppView>
                      <TextField
                        variant="outlined"
                        label={ownerKind === 'BUSINESS' ? 'Business name' : "Owner's full name"}
                        required
                        value={ownerName}
                        onChangeText={setOwnerName}
                        maxLength={ownerKind === 'BUSINESS' ? 200 : 100}
                      />
                      <TextField
                        variant="outlined"
                        label="Owner's mobile number"
                        required
                        value={vehicleOwnerPhone}
                        onChangeText={setVehicleOwnerPhone}
                        keyboardType="phone-pad"
                        maxLength={10}
                        placeholder="10-digit number"
                        hint="The code is sent to this number."
                      />
                    </>
                  ) : null}
                </AppView>
              ) : null}

              {/* Vehicle capacity: fleet owners only (a driver's comes from the vehicle type) */}
              {isFleetOwner ? (
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
                      {capacityOptions.map((cap) => (
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
              ) : null}

              <TextField
                variant="outlined"
                ref={makeRef}
                label="Make"
                required
                value={make}
                onChangeText={setMake}
                placeholder="Enter vehicle make"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => modelRef.current?.focus()}
                error={missing.includes('make') && !make.trim() ? 'Enter the make' : undefined}
              />
              <TextField
                variant="outlined"
                ref={modelRef}
                label="Model"
                required
                value={model}
                onChangeText={setModel}
                placeholder="Enter vehicle model"
                returnKeyType="done"
                error={missing.includes('model') && !model.trim() ? 'Enter the model' : undefined}
              />
              <AppView className="gap-2">
                <AppText className="text-[13px] font-semibold text-foreground-secondary">
                  Fuel type
                  <AppText className="text-brand"> *</AppText>
                </AppText>
                <AppView row className="flex-wrap gap-2">
                  {(['PETROL', 'DIESEL', 'CNG', 'ELECTRIC'] as FuelType[]).map((fuel) => (
                    <AppPressable
                      key={fuel}
                      onPress={() => setFuelType(fuel)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: fuelType === fuel }}
                      className={`rounded-xl border px-3 py-2 ${fuelType === fuel ? 'border-brand bg-brand' : 'border-border bg-card'}`}
                    >
                      <AppText
                        className={
                          fuelType === fuel ? 'font-bold text-brand-foreground' : 'text-foreground'
                        }
                      >
                        {fuel}
                      </AppText>
                    </AppPressable>
                  ))}
                </AppView>
                {missing.includes('fuel') && !fuelType ? (
                  <AppText className="ml-1 text-xs font-medium text-error">
                    Choose the fuel type
                  </AppText>
                ) : null}
              </AppView>
              <AppView className="gap-3">
                <AppText className="text-[15px] font-bold text-foreground">
                  Vehicle documents
                </AppText>
                {isFleetOwner ? (
                  <AppText className="text-[13px] text-muted">
                    {FLEET_VEHICLE_DOCUMENTS_ENABLED
                      ? `Save the vehicle first, then upload its ${
                          fuelType === 'ELECTRIC'
                            ? 'RC and insurance'
                            : 'RC, insurance and pollution certificate'
                        } from its page.`
                      : 'Fleet vehicle document and photo uploads are not yet available.'}
                  </AppText>
                ) : (
                  <AppView className="gap-4">
                    <PhotoUploadBox
                      label="Registration certificate (RC)"
                      title="Add RC photo"
                      photoUri={rc.uri}
                      onSelectPhoto={rc.pick}
                    />
                    <PhotoUploadBox
                      label="Insurance"
                      title="Add insurance photo"
                      photoUri={insurance.uri}
                      onSelectPhoto={insurance.pick}
                    />
                    <TextField
                      variant="outlined"
                      label="Insurance expiry date"
                      placeholder="DD/MM/YYYY"
                      value={insuranceExpiry}
                      onChangeText={(value) => setInsuranceExpiry(formatDateInput(value))}
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                    {fuelType !== 'ELECTRIC' ? (
                      <>
                        <PhotoUploadBox
                          label="Pollution certificate (PUC)"
                          title="Add PUC photo"
                          photoUri={puc.uri}
                          onSelectPhoto={puc.pick}
                        />
                        <TextField
                          variant="outlined"
                          label="PUC expiry date"
                          placeholder="DD/MM/YYYY"
                          value={pucExpiry}
                          onChangeText={(value) => setPucExpiry(formatDateInput(value))}
                          keyboardType="number-pad"
                          maxLength={10}
                        />
                      </>
                    ) : null}
                    <AppText className="text-[12px] text-muted">
                      Some vehicle types also require a fitness certificate or permit before
                      approval.
                    </AppText>
                  </AppView>
                )}
              </AppView>

              {error ? (
                <AppText className="text-[13px] font-medium text-error">{error}</AppText>
              ) : null}

              {/* Save vehicle button */}
              <AppView className="mt-4 gap-3">
                <Button
                  variant="brand"
                  label={
                    addFleetVehicle.isPending || saveVehicle.isPending
                      ? 'Saving...'
                      : 'Save vehicle'
                  }
                  onPress={handleSave}
                  disabled={addFleetVehicle.isPending || saveVehicle.isPending}
                  loading={addFleetVehicle.isPending || saveVehicle.isPending}
                  size="lg"
                  textClassName="font-extrabold text-base"
                />
                <AppText className="text-center text-[12px] text-muted">
                  {isFleetOwner
                    ? FLEET_VEHICLE_DOCUMENTS_ENABLED
                      ? 'You add the documents next, and a driver once they are verified.'
                      : 'Fleet documents are not yet available in the app.'
                    : 'Your documents will be submitted for verification.'}
                </AppText>
              </AppView>
            </>
          )}
        </AppScrollView>
      </AppKeyboardAvoidingView>
      {/* Outside the form's branches: it asks the fleet owner who drives the vehicle just saved. */}
      <DriverChoiceSheet
        visible={showDriverChoice}
        vehicleLabel={newVehicle?.label ?? 'Your vehicle'}
        busy={assigningVehicleId != null}
        onDriveMyself={handleDriveMyself}
        onAddDriver={handleAddDriver}
        onLater={finishAfterSave}
      />
    </SetupScreenLayout>
  );
}

/** "today", "yesterday" or "28 Nov". */
function formatSentDate(iso: string): string {
  const sent = new Date(iso);
  if (Number.isNaN(sent.getTime())) return 'earlier';
  const days = Math.floor((Date.now() - sent.getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return sent.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
