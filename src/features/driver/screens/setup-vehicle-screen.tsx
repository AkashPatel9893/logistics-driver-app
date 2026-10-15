import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import {
  AppImage,
  AppKeyboardAvoidingView,
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  Button,
  Icon,
  TextField,
} from '@/components/ui';
import { useDriverProfile, useSaveVehicle, useVehicleTypes } from '@/hooks/use-driver';
import { getErrorMessage } from '@/lib/api/api-error';
import type { FuelType } from '@/lib/api/models';
import { toIsoDate } from '@/lib/api/onboarding';

import { PhotoUploadBox } from '../components/photo-upload-box';
import { SetupScreenLayout } from '../components/setup-screen-layout';
import { useLocalPhoto } from '../hooks/use-local-photo';
import { getVehicleImage } from '../vehicle-images';

const FUEL_TYPES: readonly { value: FuelType; label: string }[] = [
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'PETROL', label: 'Petrol' },
  { value: 'CNG', label: 'CNG' },
  { value: 'ELECTRIC', label: 'Electric' },
];

export function SetupVehicleScreen() {
  const router = useRouter();
  const { data: profile } = useDriverProfile();
  const { data: vehicleTypes = [] } = useVehicleTypes();
  const saveVehicle = useSaveVehicle();
  const current = profile?.vehicle ?? null;

  const [typeId, setTypeId] = useState(current?.vehicleTypeId ?? '');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [plateNumber, setPlateNumber] = useState(current?.plateNumber ?? '');
  const [fuelType, setFuelType] = useState<FuelType>('DIESEL');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [pucExpiry, setPucExpiry] = useState('');
  const rc = useLocalPhoto('document');
  const insurance = useLocalPhoto('document');
  const puc = useLocalPhoto('document');
  const [error, setError] = useState<string>();
  // Electric vehicles don't need a pollution certificate.
  const needsPuc = fuelType !== 'ELECTRIC';

  const handleSave = () => {
    const insuranceIso = toIsoDate(insuranceExpiry);
    const pucIso = needsPuc ? toIsoDate(pucExpiry) : null;
    if (!typeId) return setError('Choose your vehicle type.');
    if (!make.trim() || !model.trim()) return setError('Enter the vehicle make and model.');
    if (plateNumber.replace(/[^A-Z0-9]/g, '').length < 6) {
      return setError('Enter the registration number as printed on your RC.');
    }
    if (!insuranceIso) return setError('Enter the insurance validity date as DD/MM/YYYY.');
    if (needsPuc && !pucIso) return setError('Enter the pollution certificate date as DD/MM/YYYY.');
    if (!rc.uri || !insurance.uri || (needsPuc && !puc.uri)) {
      return setError(
        needsPuc
          ? 'Add photos of the RC, insurance and pollution certificate.'
          : 'Add photos of the RC and insurance.',
      );
    }
    setError(undefined);
    saveVehicle.mutate(
      {
        vehicleTypeId: typeId,
        make,
        model,
        plateNumber,
        fuelType,
        rcPhotoUri: rc.uri,
        insurancePhotoUri: insurance.uri,
        insuranceExpiry: insuranceIso,
        pucPhotoUri: needsPuc ? puc.uri : null,
        pucExpiry: pucIso,
      },
      {
        onSuccess: () =>
          Alert.alert('Vehicle submitted', 'Your vehicle and its documents have been uploaded.', [
            { text: 'OK', onPress: () => router.back() },
          ]),
        onError: (e) => setError(getErrorMessage(e)),
      },
    );
  };

  return (
    <SetupScreenLayout title="Your vehicle" subtitle="Vehicle type, registration and photos">
      <AppKeyboardAvoidingView>
        <AppScrollView
          contentContainerClassName="gap-5 px-5 pb-16 pt-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AppView>
            <AppText className="mb-2 text-[14px] font-semibold text-foreground">
              Vehicle type
            </AppText>
            <AppView row className="flex-wrap gap-2">
              {vehicleTypes.map((type) => {
                const isSelected = typeId === type.id;
                return (
                  <AppPressable
                    key={type.id}
                    onPress={() => setTypeId(type.id)}
                    accessibilityState={{ selected: isSelected }}
                    className={`w-[31%] items-center rounded-2xl border px-2 py-3 ${
                      isSelected ? 'border-brand bg-brand/10' : 'border-border bg-card'
                    }`}
                  >
                    <AppImage
                      source={getVehicleImage(type.imageUrl)}
                      contentFit="contain"
                      className="h-10 w-16"
                    />
                    <AppText
                      className={`mt-1 text-[12px] ${isSelected ? 'font-bold text-brand' : 'font-medium text-foreground'}`}
                    >
                      {type.name}
                    </AppText>
                    <AppText className="text-[10px] text-muted">
                      {type.capacityKg.toLocaleString('en-IN')} kg
                    </AppText>
                  </AppPressable>
                );
              })}
            </AppView>
          </AppView>

          <TextField
            variant="outlined"
            label="Make"
            required
            value={make}
            onChangeText={setMake}
            placeholder="e.g. Tata"
            autoCorrect={false}
            leading={<Icon name="box.truck" size={18} tone="icon-subtle" />}
          />

          <TextField
            variant="outlined"
            label="Model"
            required
            value={model}
            onChangeText={setModel}
            placeholder="e.g. Ace Gold"
            autoCorrect={false}
          />

          <AppView>
            <AppText className="mb-2 text-[14px] font-semibold text-foreground">Fuel type</AppText>
            <AppView row className="flex-wrap gap-2">
              {FUEL_TYPES.map((fuel) => {
                const isSelected = fuelType === fuel.value;
                return (
                  <AppPressable
                    key={fuel.value}
                    onPress={() => setFuelType(fuel.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    className={`rounded-full border px-4 py-2 ${
                      isSelected ? 'border-brand bg-brand/10' : 'border-border bg-card'
                    }`}
                  >
                    <AppText
                      className={`text-[13px] ${isSelected ? 'font-bold text-brand' : 'font-medium text-foreground'}`}
                    >
                      {fuel.label}
                    </AppText>
                  </AppPressable>
                );
              })}
            </AppView>
          </AppView>

          <TextField
            variant="outlined"
            label="Registration number"
            required
            value={plateNumber}
            onChangeText={(t) => setPlateNumber(t.toUpperCase())}
            placeholder="e.g. DL 1L AB 1234"
            autoCapitalize="characters"
            hint="Exactly as printed on your RC"
            leading={<Icon name="tag.fill" size={18} tone="icon-subtle" />}
          />

          <PhotoUploadBox
            label="Registration certificate (RC)"
            title="Add RC photo"
            hint="Front side, all text readable"
            photoUri={rc.uri}
            uploading={false}
            onSelectPhoto={rc.pick}
          />

          <TextField
            variant="outlined"
            label="Insurance valid until"
            required
            value={insuranceExpiry}
            onChangeText={setInsuranceExpiry}
            placeholder="DD/MM/YYYY"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />

          <PhotoUploadBox
            label="Insurance policy"
            title="Add insurance photo"
            hint="Policy number and validity date readable"
            photoUri={insurance.uri}
            uploading={false}
            onSelectPhoto={insurance.pick}
          />

          {needsPuc ? (
            <>
              <TextField
                variant="outlined"
                label="Pollution certificate valid until"
                required
                value={pucExpiry}
                onChangeText={setPucExpiry}
                placeholder="DD/MM/YYYY"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />

              <PhotoUploadBox
                label="Pollution certificate (PUC)"
                title="Add PUC photo"
                hint="Certificate number and validity date readable"
                photoUri={puc.uri}
                uploading={false}
                onSelectPhoto={puc.pick}
              />
            </>
          ) : null}

          {error ? <AppText className="text-[13px] font-medium text-error">{error}</AppText> : null}

          <Button
            label={current ? 'Update vehicle' : 'Submit vehicle'}
            onPress={handleSave}
            loading={saveVehicle.isPending}
            size="lg"
            textClassName="font-extrabold text-base"
          />
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </SetupScreenLayout>
  );
}
