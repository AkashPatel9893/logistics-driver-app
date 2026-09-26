import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import {
  AppKeyboardAvoidingView,
  AppScrollView,
  AppText,
  Button,
  Icon,
  TextField,
} from '@/components/ui';
import { useDriverProfile, useSaveKyc } from '@/hooks/use-driver';
import { getErrorMessage } from '@/lib/api/api-error';

import { PhotoUploadBox } from '../components/photo-upload-box';
import { SetupScreenLayout } from '../components/setup-screen-layout';
import { usePhotoUpload } from '../hooks/use-photo-upload';

export function SetupKycScreen() {
  const router = useRouter();
  const { data: profile } = useDriverProfile();
  const saveKyc = useSaveKyc();
  const current = profile?.kyc ?? null;

  const [panNumber, setPanNumber] = useState(current?.panNumber ?? '');
  const [dlNumber, setDlNumber] = useState(current?.dlNumber ?? '');
  const dl = usePhotoUpload('kyc_dl', current?.dlPhotoUrl ?? null, 'document');
  const aadhaar = usePhotoUpload('kyc_aadhaar', current?.aadhaarPhotoUrl ?? null, 'document');
  const [error, setError] = useState<string>();

  const handleSubmit = () => {
    if (!dl.url || !aadhaar.url) return setError('Add photos of your licence and Aadhaar.');
    setError(undefined);
    saveKyc.mutate(
      { panNumber, dlNumber, dlPhotoUrl: dl.url, aadhaarPhotoUrl: aadhaar.url },
      {
        onSuccess: () =>
          Alert.alert(
            'KYC submitted',
            'We are verifying your documents. This takes a few minutes.',
            [{ text: 'OK', onPress: () => router.back() }],
          ),
        onError: (e) => setError(getErrorMessage(e)),
      },
    );
  };

  return (
    <SetupScreenLayout title="KYC verification" subtitle="Identity and driving licence">
      <AppKeyboardAvoidingView>
        <AppScrollView
          contentContainerClassName="gap-5 px-5 pb-16 pt-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TextField
            variant="outlined"
            label="PAN number"
            required
            value={panNumber}
            onChangeText={(t) => setPanNumber(t.toUpperCase())}
            placeholder="ABCDE1234F"
            autoCapitalize="characters"
            maxLength={10}
            leading={<Icon name="checkmark.shield.fill" size={18} tone="icon-subtle" />}
          />

          <TextField
            variant="outlined"
            label="Driving licence number"
            required
            value={dlNumber}
            onChangeText={(t) => setDlNumber(t.toUpperCase())}
            placeholder="DL-0420190012345"
            autoCapitalize="characters"
            maxLength={18}
            leading={<Icon name="document" size={18} tone="icon-subtle" />}
          />

          <PhotoUploadBox
            label="Driving licence"
            title="Add licence photo"
            hint="Name, photo and validity date must be readable"
            photoUri={dl.previewUri}
            uploading={dl.uploading}
            error={dl.error}
            onSelectPhoto={dl.pick}
          />

          <PhotoUploadBox
            label="Aadhaar card"
            title="Add Aadhaar photo"
            hint="Front side with your photo and address"
            photoUri={aadhaar.previewUri}
            uploading={aadhaar.uploading}
            error={aadhaar.error}
            onSelectPhoto={aadhaar.pick}
          />

          {error ? <AppText className="text-[13px] font-medium text-error">{error}</AppText> : null}

          <Button
            label={current ? 'Update KYC' : 'Submit KYC'}
            onPress={handleSubmit}
            loading={saveKyc.isPending}
            disabled={dl.uploading || aadhaar.uploading}
            size="lg"
            textClassName="font-extrabold text-base"
          />
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </SetupScreenLayout>
  );
}
