import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  AppKeyboardAvoidingView,
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  TextField,
} from '@/components/ui';
import { SetupScreenLayout } from '@/features/driver/components/setup-screen-layout';
import { useLocalPhoto } from '@/features/driver/hooks/use-local-photo';
import { getErrorMessage } from '@/lib/api/api-error';
import { goBack } from '@/lib/go-back';

import { DocPhotoSlot, DocumentStatusNote, StepStatusIcon, StickyFooter } from '../components';
import { DocumentPreview } from '../document-preview';
import {
  documentState,
  findDocument,
  useDriverDocuments,
  useSubmitDriverDocument,
} from '../use-registration';

type IdType = 'AADHAAR' | 'PAN';

/** "1234 5678 9012" while typing. */
function formatAadhaar(text: string) {
  const digits = text.replace(/\D/g, '').slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** Aadhaar and PAN on one screen. PAN is required to go online; Aadhaar is optional. */
export function IdentityScreen() {
  const router = useRouter();
  const { data: docs } = useDriverDocuments();
  const pan = findDocument(docs, 'PAN');
  const aadhaar = findDocument(docs, 'AADHAAR');
  const panState = documentState(pan?.status);
  const aadhaarState = documentState(aadhaar?.status);
  const submit = useSubmitDriverDocument();

  // Open the one still needed, PAN first since it is required.
  const [idType, setIdType] = useState<IdType>(
    panState === 'todo' || panState === 'rejected' ? 'PAN' : 'AADHAAR',
  );
  const aadhaarFront = useLocalPhoto('document');
  const aadhaarBack = useLocalPhoto('document');
  const panFront = useLocalPhoto('document');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [error, setError] = useState<string>();

  const isAadhaar = idType === 'AADHAAR';
  const aadhaarDigits = aadhaarNumber.replace(/\D/g, '');
  const panValid = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber);
  const canSubmit = isAadhaar
    ? Boolean(aadhaarFront.uri && aadhaarBack.uri && aadhaarDigits.length === 12)
    : Boolean(panFront.uri && panValid);
  const current = isAadhaar ? aadhaar : pan;

  const switchTo = (type: IdType) => {
    setError(undefined);
    setIdType(type);
  };

  const handleSubmit = () => {
    setError(undefined);
    submit.mutate(
      isAadhaar
        ? {
            type: 'AADHAAR',
            identifier: aadhaarDigits,
            fileUri: aadhaarFront.uri!,
            backFileUri: aadhaarBack.uri,
          }
        : { type: 'PAN', identifier: panNumber, fileUri: panFront.uri! },
      {
        onSuccess: () => {
          // After PAN, offer Aadhaar if it is still missing; otherwise back to the list.
          if (!isAadhaar && aadhaarState === 'todo') switchTo('AADHAAR');
          else goBack(router);
        },
        onError: (e) => setError(getErrorMessage(e)),
      },
    );
  };

  const tab = (type: IdType, label: string, sub: string, state: typeof panState) => {
    const selected = idType === type;
    return (
      <AppPressable
        onPress={() => switchTo(type)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        className={`flex-1 rounded-2xl border-2 px-3.5 py-3 ${
          selected ? 'border-brand bg-brand-soft' : 'border-border/80 bg-surface'
        }`}
      >
        <AppView row className="justify-between">
          <AppText className="text-[15px] font-bold text-foreground">{label}</AppText>
          {state === 'todo' ? (
            <AppView
              className={`h-5 w-5 rounded-full border-2 ${selected ? 'border-[6px] border-brand' : 'border-border'}`}
            />
          ) : (
            <StepStatusIcon state={state} />
          )}
        </AppView>
        <AppText className="mt-0.5 text-[11px] font-medium text-muted">{sub}</AppText>
      </AppPressable>
    );
  };

  return (
    <SetupScreenLayout title="Aadhaar & PAN" subtitle="Identity verification">
      <AppKeyboardAvoidingView>
        <AppScrollView
          contentContainerClassName="gap-4 px-5 pb-10 pt-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AppText className="text-[13px] font-semibold text-foreground-secondary">
            Select ID to upload
          </AppText>
          <AppView row className="gap-3">
            {tab('PAN', 'PAN Card', 'Required', panState)}
            {tab('AADHAAR', 'Aadhaar', 'Optional · faster approval', aadhaarState)}
          </AppView>

          <DocumentStatusNote
            state={documentState(current?.status)}
            masked={current?.identifierMasked}
            reason={current?.rejectionReason}
          />

          {isAadhaar ? (
            <>
              <DocPhotoSlot
                title="Front side of your Aadhaar"
                uri={aadhaarFront.uri}
                onPick={aadhaarFront.pick}
                disabled={submit.isPending}
              />
              <DocPhotoSlot
                title="Back side of your Aadhaar"
                hint="The side with your address"
                uri={aadhaarBack.uri}
                onPick={aadhaarBack.pick}
                disabled={submit.isPending}
              />
              <TextField
                variant="outlined"
                label="Enter Aadhaar number"
                required
                value={aadhaarNumber}
                onChangeText={(t) => setAadhaarNumber(formatAadhaar(t))}
                placeholder="1234 5678 9012"
                keyboardType="number-pad"
                maxLength={14}
                hint="The 12-digit number on the front of your card"
              />
              <DocumentPreview
                kind="aadhaar"
                caption="Your 12-digit Aadhaar number is printed in large digits at the bottom of the front side."
              />
            </>
          ) : (
            <>
              <DocPhotoSlot
                title="Front side of your PAN card"
                uri={panFront.uri}
                onPick={panFront.pick}
                disabled={submit.isPending}
              />
              <TextField
                variant="outlined"
                label="Enter PAN number"
                required
                value={panNumber}
                onChangeText={(t) =>
                  setPanNumber(
                    t
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, '')
                      .slice(0, 10),
                  )
                }
                placeholder="ABCDE1234F"
                autoCapitalize="characters"
                autoCorrect={false}
                error={
                  panNumber.length === 10 && !panValid
                    ? 'Enter a valid PAN, e.g. ABCDE1234F'
                    : undefined
                }
                hint="5 letters, 4 numbers, 1 letter"
              />
              <DocumentPreview
                kind="pan"
                caption="Your PAN is the 10-character number under 'Permanent Account Number Card'."
              />
            </>
          )}

          {error ? <AppText className="text-[13px] font-medium text-error">{error}</AppText> : null}
        </AppScrollView>
      </AppKeyboardAvoidingView>
      <StickyFooter
        label={submit.isPending ? 'Uploading…' : `Submit ${isAadhaar ? 'Aadhaar' : 'PAN'}`}
        onPress={handleSubmit}
        disabled={!canSubmit || submit.isPending}
        loading={submit.isPending}
      />
    </SetupScreenLayout>
  );
}
