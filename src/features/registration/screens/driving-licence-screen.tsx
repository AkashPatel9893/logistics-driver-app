import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  AppKeyboardAvoidingView,
  AppScrollView,
  AppText,
  AppView,
  TextField,
} from '@/components/ui';
import { SetupScreenLayout } from '@/features/driver/components/setup-screen-layout';
import { useLocalPhoto } from '@/features/driver/hooks/use-local-photo';
import { getErrorMessage } from '@/lib/api/api-error';
import { formatDateInput, toIsoDate } from '@/lib/api/onboarding';
import { goBack } from '@/lib/go-back';

import { DocPhotoSlot, DocumentStatusNote, StickyFooter, TipsCard } from '../components';
import { DocumentPreview } from '../document-preview';
import {
  documentState,
  findDocument,
  useDriverDocuments,
  useSubmitDriverDocument,
} from '../use-registration';

export function DrivingLicenceScreen() {
  const router = useRouter();
  const { data: docs } = useDriverDocuments();
  const current = findDocument(docs, 'DRIVING_LICENCE');
  const submit = useSubmitDriverDocument();
  const front = useLocalPhoto('document');
  const back = useLocalPhoto('document');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [error, setError] = useState<string>();

  const expiryIso = toIsoDate(expiry);
  const numberValid = number.length >= 10;
  const canSubmit = Boolean(front.uri && back.uri && numberValid && expiryIso);

  const handleSubmit = () => {
    if (!expiryIso) return setError('Enter the validity date as DD/MM/YYYY.');
    if (Date.parse(expiryIso) < Date.now()) return setError('This driving licence has expired.');
    setError(undefined);
    submit.mutate(
      {
        type: 'DRIVING_LICENCE',
        identifier: number,
        expiryDate: expiryIso,
        fileUri: front.uri!,
        backFileUri: back.uri,
      },
      { onSuccess: () => goBack(router), onError: (e) => setError(getErrorMessage(e)) },
    );
  };

  return (
    <SetupScreenLayout title="Driving Licence" subtitle="Both sides and the licence number">
      <AppKeyboardAvoidingView>
        <AppScrollView
          contentContainerClassName="gap-4 px-5 pb-10 pt-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <DocumentStatusNote
            state={documentState(current?.status)}
            masked={current?.identifierMasked}
            reason={current?.rejectionReason}
          />

          <DocPhotoSlot
            title="Front side of your DL"
            uri={front.uri}
            onPick={front.pick}
            disabled={submit.isPending}
          />
          <DocPhotoSlot
            title="Back side of your DL"
            hint="Upload the back side even if it is blank."
            uri={back.uri}
            onPick={back.pick}
            disabled={submit.isPending}
          />

          <TextField
            variant="outlined"
            label="Enter Driving Licence number"
            required
            value={number}
            onChangeText={(t) =>
              setNumber(
                t
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 16),
              )
            }
            placeholder="KA0520190012345"
            autoCapitalize="characters"
            autoCorrect={false}
            hint="Eg: KA1234567899029 · Special characters are not allowed"
          />

          <DocumentPreview
            kind="dl"
            caption="Your licence number is printed near the top, after 'DL No'. Type it without spaces or dashes. The 'Valid Till' date goes in the next field."
          />

          <TextField
            variant="outlined"
            label="Licence valid until"
            required
            value={expiry}
            onChangeText={(v) => setExpiry(formatDateInput(v))}
            placeholder="DD/MM/YYYY"
            keyboardType="number-pad"
            maxLength={10}
            hint="The 'Valid till' date printed on your licence"
          />

          <TipsCard
            title="For quick approval"
            tips={[
              'Place the card on a flat, dark surface in good light',
              'All four corners and every detail must be visible',
              'No blur, glare or fingers covering the text',
            ]}
          />

          {error ? <AppText className="text-[13px] font-medium text-error">{error}</AppText> : null}
          <AppView className="h-2" />
        </AppScrollView>
      </AppKeyboardAvoidingView>
      <StickyFooter
        label={submit.isPending ? 'Uploading… this may take a few seconds' : 'Submit'}
        onPress={handleSubmit}
        disabled={!canSubmit || submit.isPending}
        loading={submit.isPending}
      />
    </SetupScreenLayout>
  );
}
