import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

import {
  DocPhotoSlot,
  DocumentStatusNote,
  StepStatusIcon,
  StickyFooter,
  SubmittedPhotos,
} from '../components';
import { DocumentPreview } from '../document-preview';
import { documentState, findDocument } from '../registration-steps';
import { useDriverDocuments, useSubmitDriverDocument } from '../use-registration';
import { markSubmitted, useDraftText } from '../drafts';
import { goToNextStep } from '../next-step';
import { goBack } from '@/lib/go-back';

type IdType = 'AADHAAR' | 'PAN';

/** Small line on a tab: what to upload, or where it stands. */
function tabSub(state: ReturnType<typeof documentState>, todo: string) {
  switch (state) {
    case 'verified':
      return 'Verified';
    case 'review':
      return 'Under verification';
    case 'rejected':
      return 'Upload again';
    default:
      return todo;
  }
}

/** "1234 5678 9012" while typing. */
function formatAadhaar(text: string) {
  const digits = text.replace(/\D/g, '').slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** PAN and Aadhaar on one screen: the driver adds both (one tab each). */
export function IdentityScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: docs } = useDriverDocuments();
  const pan = findDocument(docs, 'PAN');
  const aadhaar = findDocument(docs, 'AADHAAR');
  const panState = documentState(pan?.status);
  const aadhaarState = documentState(aadhaar?.status);
  const submit = useSubmitDriverDocument();

  // From My documents: `type` is the card to replace, `update` unlocks it and returns there.
  const { update, type: requested } = useLocalSearchParams<{ update?: string; type?: string }>();

  // The requested one, else the one still needed: PAN first, then Aadhaar.
  const [idType, setIdType] = useState<IdType>(() => {
    if (requested === 'PAN' || requested === 'AADHAAR') return requested;
    return panState !== 'todo' &&
      panState !== 'rejected' &&
      (aadhaarState === 'todo' || aadhaarState === 'rejected')
      ? 'AADHAAR'
      : 'PAN';
  });
  // Kept on the phone until submitted, so closing the app mid-step loses nothing.
  const aadhaarFront = useLocalPhoto('aadhaar.front');
  const aadhaarBack = useLocalPhoto('aadhaar.back');
  const panFront = useLocalPhoto('pan.front');
  const [aadhaarNumber, setAadhaarNumber] = useDraftText('aadhaar.number');
  const [panNumber, setPanNumber] = useDraftText('pan.number');
  const [error, setError] = useState<string>();

  const isAadhaar = idType === 'AADHAAR';
  const aadhaarDigits = aadhaarNumber.replace(/\D/g, '');
  const panValid = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber);
  const canSubmit = isAadhaar
    ? Boolean(aadhaarFront.uri && aadhaarBack.uri && aadhaarDigits.length === 12)
    : Boolean(panFront.uri && panValid);
  const current = isAadhaar ? aadhaar : pan;
  const currentState = documentState(current?.status);
  // Verified: view only. Under review / rejected: shows what was sent, to update.
  const locked = currentState === 'verified' && !(update && idType === requested);

  const switchTo = (type: IdType) => {
    setError(undefined);
    setIdType(type);
  };

  const handleSubmit = () => {
    // A quick double tap must not send the document twice.
    if (submit.isPending) return;
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
          markSubmitted(isAadhaar ? 'aadhaar.' : 'pan.');
          if (update) {
            goBack(router);
            return;
          }
          // Both are needed: open the other one if it is still missing, else the next step.
          const otherState = isAadhaar ? panState : aadhaarState;
          if (otherState === 'todo' || otherState === 'rejected')
            switchTo(isAadhaar ? 'PAN' : 'AADHAAR');
          else goToNextStep(router, queryClient, 'identity');
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
        <AppText className="mt-1 text-[11px] font-medium text-muted">{sub}</AppText>
      </AppPressable>
    );
  };

  return (
    <SetupScreenLayout title="PAN & Aadhaar" subtitle="Identity verification">
      <AppKeyboardAvoidingView>
        <AppScrollView
          contentContainerClassName="gap-4 px-5 pb-10 pt-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AppText className="text-[13px] leading-5 text-foreground-secondary">
            Add both your PAN card and Aadhaar card to verify your identity.
          </AppText>
          <AppView row className="gap-3">
            {tab('PAN', 'PAN Card', tabSub(panState, 'Front side'), panState)}
            {tab('AADHAAR', 'Aadhaar', tabSub(aadhaarState, 'Front & back'), aadhaarState)}
          </AppView>

          <DocumentStatusNote
            state={currentState}
            replacing={!locked}
            masked={current?.identifierMasked}
            reason={current?.rejectionReason}
          />

          {locked ? (
            // Verified: only what is on file (and the photos, if sent from this phone).
            <SubmittedPhotos
              uris={isAadhaar ? [aadhaarFront.uri, aadhaarBack.uri] : [panFront.uri]}
            />
          ) : isAadhaar ? (
            <>
              <DocPhotoSlot
                title="Front side of your Aadhaar"
                uri={aadhaarFront.uri}
                onPick={aadhaarFront.pick}
                disabled={locked || submit.isPending}
              />
              <DocPhotoSlot
                title="Back side of your Aadhaar"
                hint="The side with your address"
                uri={aadhaarBack.uri}
                onPick={aadhaarBack.pick}
                disabled={locked || submit.isPending}
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
                disabled={locked || submit.isPending}
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
        </AppScrollView>
      </AppKeyboardAvoidingView>
      {locked ? null : (
        <StickyFooter
          label={
            submit.isPending
              ? 'Uploading…'
              : `${currentState === 'todo' ? 'Submit' : 'Update'} ${isAadhaar ? 'Aadhaar' : 'PAN'}`
          }
          onPress={handleSubmit}
          disabled={!canSubmit || submit.isPending}
          loading={submit.isPending}
        >
          {error ? (
            <AppText className="text-center text-[13px] font-medium text-error">{error}</AppText>
          ) : null}
        </StickyFooter>
      )}
    </SetupScreenLayout>
  );
}
