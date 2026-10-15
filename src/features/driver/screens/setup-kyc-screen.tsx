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
import { toIsoDate } from '@/lib/api/onboarding';

import { PhotoUploadBox } from '../components/photo-upload-box';
import { SetupScreenLayout } from '../components/setup-screen-layout';
import { useLocalPhoto } from '../hooks/use-local-photo';

/** Licence, PAN and a selfie — the three identity documents the backend requires. */
export function SetupKycScreen() {
  const router = useRouter();
  const { data: profile } = useDriverProfile();
  const saveKyc = useSaveKyc();
  const current = profile?.kyc ?? null;

  // Numbers are stored masked on the server, so they are entered again to resubmit.
  const [panNumber, setPanNumber] = useState('');
  const [dlNumber, setDlNumber] = useState('');
  const [dlExpiry, setDlExpiry] = useState('');
  const pan = useLocalPhoto('document');
  const dl = useLocalPhoto('document');
  const selfie = useLocalPhoto('camera');
  const [error, setError] = useState<string>();

  const handleSubmit = () => {
    const expiry = toIsoDate(dlExpiry);
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) return setError('Enter a valid PAN number.');
    if (dlNumber.trim().length < 6) return setError('Enter your driving licence number.');
    if (!expiry) return setError('Enter the licence validity date as DD/MM/YYYY.');
    if (Date.parse(expiry) < Date.now()) return setError('This driving licence has expired.');
    if (!pan.uri || !dl.uri || !selfie.uri) {
      return setError('Add photos of your PAN and licence, and take a selfie.');
    }
    setError(undefined);
    saveKyc.mutate(
      {
        panNumber,
        panPhotoUri: pan.uri,
        dlNumber: dlNumber.replace(/[^A-Z0-9]/g, ''),
        dlExpiry: expiry,
        dlPhotoUri: dl.uri,
        selfieUri: selfie.uri,
      },
      {
        onSuccess: () =>
          Alert.alert('Documents submitted', 'Your licence, PAN and selfie have been uploaded.', [
            { text: 'OK', onPress: () => router.back() },
          ]),
        onError: (e) => setError(getErrorMessage(e)),
      },
    );
  };

  return (
    <SetupScreenLayout title="KYC verification" subtitle="Driving licence, PAN and selfie">
      <AppKeyboardAvoidingView>
        <AppScrollView
          contentContainerClassName="gap-5 px-5 pb-16 pt-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {current ? (
            <AppText className="text-[13px] text-muted">
              On file: licence {current.dlNumber || '—'}, PAN {current.panNumber || '—'}
              {current.missing.length > 0 ? `. Still needed: ${current.missing.join(', ')}` : ''}.
              Submitting again replaces them.
            </AppText>
          ) : null}

          <TextField
            variant="outlined"
            label="Driving licence number"
            required
            value={dlNumber}
            onChangeText={(t) => setDlNumber(t.toUpperCase())}
            placeholder="KA0520190012345"
            autoCapitalize="characters"
            maxLength={18}
            leading={<Icon name="document" size={18} tone="icon-subtle" />}
          />

          <TextField
            variant="outlined"
            label="Licence valid until"
            required
            value={dlExpiry}
            onChangeText={setDlExpiry}
            placeholder="DD/MM/YYYY"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            hint="The validity date printed on your licence"
          />

          <PhotoUploadBox
            label="Driving licence"
            title="Add licence photo"
            hint="Name, photo and validity date must be readable"
            photoUri={dl.uri}
            uploading={false}
            onSelectPhoto={dl.pick}
          />

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

          <PhotoUploadBox
            label="PAN card"
            title="Add PAN photo"
            hint="Front side, number and name readable"
            photoUri={pan.uri}
            uploading={false}
            onSelectPhoto={pan.pick}
          />

          <PhotoUploadBox
            label="Your selfie"
            title="Take a selfie"
            hint="Face the camera in good light, no cap or sunglasses"
            photoUri={selfie.uri}
            uploading={false}
            onSelectPhoto={selfie.pick}
          />

          {error ? <AppText className="text-[13px] font-medium text-error">{error}</AppText> : null}

          <Button
            label={current ? 'Resubmit documents' : 'Submit documents'}
            onPress={handleSubmit}
            loading={saveKyc.isPending}
            size="lg"
            textClassName="font-extrabold text-base"
          />
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </SetupScreenLayout>
  );
}
