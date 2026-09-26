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

import { PhotoUploadBox } from '../components/photo-upload-box';
import { SetupScreenLayout } from '../components/setup-screen-layout';
import { usePhotoUpload } from '../hooks/use-photo-upload';
import { VEHICLE_IMAGES } from '../vehicle-images';

export function SetupVehicleScreen() {
  const router = useRouter();
  const { data: profile } = useDriverProfile();
  const { data: vehicleTypes = [] } = useVehicleTypes();
  const saveVehicle = useSaveVehicle();
  const current = profile?.vehicle ?? null;

  const [typeId, setTypeId] = useState(current?.vehicleTypeId ?? '');
  const [model, setModel] = useState(current?.model ?? '');
  const [plateNumber, setPlateNumber] = useState(current?.plateNumber ?? '');
  const rc = usePhotoUpload('vehicle_rc', current?.rcPhotoUrl ?? null, 'document');
  const front = usePhotoUpload('vehicle_front', current?.frontPhotoUrl ?? null);
  const [error, setError] = useState<string>();

  const handleSave = () => {
    if (!typeId) return setError('Choose your vehicle type.');
    if (!rc.url || !front.url) return setError('Add both the RC and vehicle photos.');
    setError(undefined);
    saveVehicle.mutate(
      { vehicleTypeId: typeId, model, plateNumber, rcPhotoUrl: rc.url, frontPhotoUrl: front.url },
      {
        onSuccess: () =>
          Alert.alert('Vehicle submitted', 'We are verifying your RC. This takes a few minutes.', [
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
                    {VEHICLE_IMAGES[type.imageKey] ? (
                      <AppImage
                        source={VEHICLE_IMAGES[type.imageKey]}
                        contentFit="contain"
                        className="h-10 w-16"
                      />
                    ) : null}
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
            label="Make & model"
            required
            value={model}
            onChangeText={setModel}
            placeholder="e.g. Tata Ace Gold"
            autoCorrect={false}
            leading={<Icon name="box.truck" size={18} tone="icon-subtle" />}
          />

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
            photoUri={rc.previewUri}
            uploading={rc.uploading}
            error={rc.error}
            onSelectPhoto={rc.pick}
          />

          <PhotoUploadBox
            label="Vehicle front photo"
            title="Take vehicle photo"
            hint="Full front with the number plate visible"
            photoUri={front.previewUri}
            uploading={front.uploading}
            error={front.error}
            onSelectPhoto={front.pick}
          />

          {error ? <AppText className="text-[13px] font-medium text-error">{error}</AppText> : null}

          <Button
            label={current ? 'Update vehicle' : 'Submit vehicle'}
            onPress={handleSave}
            loading={saveVehicle.isPending}
            disabled={rc.uploading || front.uploading}
            size="lg"
            textClassName="font-extrabold text-base"
          />
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </SetupScreenLayout>
  );
}
