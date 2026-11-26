import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  AppImage,
  AppKeyboardAvoidingView,
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  Icon,
  TextField,
} from '@/components/ui';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { SetupScreenLayout } from '@/features/driver/components/setup-screen-layout';
import { useDriverProfile } from '@/hooks/use-driver';
import { ApiError, getErrorMessage } from '@/lib/api/api-error';
import { authApi } from '@/lib/api/auth';
import { queryKeys } from '@/lib/queries/keys';

import { DocumentStatusNote, StickyFooter, TipsCard } from '../components';
import { documentState, findDocument } from '../registration-steps';
import { useDriverDocuments, useSubmitDriverDocument } from '../use-registration';
import { markSubmitted, readDraftPhoto, useDraftText } from '../drafts';
import { useSelfieStore } from '../use-selfie-store';
import { goToNextStep } from '../next-step';
import { goBack } from '@/lib/go-back';

type Gender = 'MALE' | 'FEMALE' | 'OTHER';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

/** Selfie (checked by ops against the licence photo) plus the name customers will see. */
export function ProfilePhotoScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profile } = useDriverProfile();
  const { data: docs } = useDriverDocuments();
  const current = findDocument(docs, 'SELFIE');
  const submit = useSubmitDriverDocument();
  // Taken on the selfie screen (round camera frame) and handed back through this store.
  // Fresh from the selfie screen, or the one kept on the phone if the app was closed in between.
  const [draftPhoto] = useState(() => readDraftPhoto('profile.photo'));
  const photo = useSelfieStore((state) => state.uri) ?? draftPhoto;
  // Null until the driver taps Edit: then the name shown is the one on the profile.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  // The signed-in user already has the name and DOB from Driver details: shown at once, without
  // waiting for the profile request.
  const user = useAuthStore.use.user();
  const name = nameDraft ?? (profile?.name || user?.name || '');
  const [genderDraft, setGenderDraft] = useDraftText('profile.gender');
  const gender = (genderDraft || null) as Gender | null;
  const setGender = (value: Gender) => setGenderDraft(value);
  // What was there when the screen opened, to tell an edit from "nothing changed".
  const [initialGender] = useState(genderDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  // The photo arrives from the selfie screen (step 1); forget it once this screen closes.
  useEffect(() => () => useSelfieStore.getState().setUri(null), []);

  const takeSelfie = () => router.push('/register-selfie');
  const dob = profile?.dob || user?.dob || null;
  // ISO (YYYY-MM-DD) → DD/MM/YYYY; anything else is shown as stored.
  const dobLabel = dob
    ? /^\d{4}-\d{2}-\d{2}$/.test(dob)
      ? dob.split('-').reverse().join('/')
      : dob
    : null;

  // A selfie is already on file: a later visit is an edit, so no new photo is needed.
  const hasSelfie = documentState(current?.status) !== 'todo';
  // The backend locks name and date of birth once the application is submitted.
  const onboardingStatus = profile?.onboarding.status;
  const nameLocked = onboardingStatus === 'submitted' || onboardingStatus === 'approved';
  const nameChanged = nameDraft !== null && nameDraft.trim() !== (profile?.name ?? '');
  const genderChanged = Boolean(gender) && genderDraft !== initialGender;
  const hasChanges = nameChanged || genderChanged || Boolean(photo);
  const canSave = hasSelfie ? hasChanges : Boolean(photo) && Boolean(gender);
  const LOCKED_MESSAGE =
    "Your name and date of birth can't be changed after your application is submitted. Contact support if they are wrong.";

  const handleSubmit = async () => {
    if (!canSave) return;
    if (name.trim().length < 2) return setError('Enter your full name.');
    if (!hasSelfie && !gender) return setError('Select your gender.');
    setError(undefined);
    setSaving(true);
    try {
      // Name and gender go together: the backend clears gender on a save without it.
      if (profile?.dob && (nameChanged || genderChanged || !hasSelfie)) {
        try {
          const updated = await authApi.updateProfile({
            name: name.trim(),
            dob: profile.dob,
            ...(gender ? { gender } : {}),
          });
          useAuthStore.getState().setUser(updated);
          queryClient.invalidateQueries({ queryKey: queryKeys.profile });
        } catch (e) {
          if (!(e instanceof ApiError && e.code === 'PROFILE_LOCKED')) throw e;
          // Locked: only a new photo can still go through; say so instead of failing silently.
          if (!photo) {
            setError(LOCKED_MESSAGE);
            return;
          }
        }
      }
      if (photo) await submit.mutateAsync({ type: 'SELFIE', fileUri: photo });
      markSubmitted('profile.');
      // First time: on to the next registration step. An edit goes back to where it came from.
      if (hasSelfie) goBack(router);
      else await goToNextStep(router, queryClient, 'photo');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SetupScreenLayout
      title="Profile information"
      subtitle="Step 2 of 2 · How customers will see you"
    >
      <AppKeyboardAvoidingView>
        <AppScrollView
          contentContainerClassName="gap-5 px-5 pb-10 pt-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {error ? <AppText className="text-[13px] font-medium text-error">{error}</AppText> : null}

          <DocumentStatusNote
            state={documentState(current?.status)}
            reason={current?.rejectionReason}
          />

          <AppView className="items-center gap-3">
            <AppPressable
              onPress={takeSelfie}
              disabled={saving}
              pressScale={0.96}
              accessibilityLabel={photo ? 'Retake selfie' : 'Take a selfie'}
              className="h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-brand-soft bg-surface-muted"
            >
              {photo ? (
                <AppImage source={{ uri: photo }} contentFit="cover" className="h-full w-full" />
              ) : (
                <Icon name="person.crop.circle" size={72} tone="icon-faint" />
              )}
            </AppPressable>
            <AppPressable
              onPress={takeSelfie}
              disabled={saving}
              className="flex-row items-center gap-1.5"
            >
              <Icon name="camera" size={15} color="#2563eb" />
              <AppText className="text-[14px] font-bold text-[#2563eb]">
                {photo ? 'Edit profile photo' : 'Take profile photo'}
              </AppText>
            </AppPressable>
          </AppView>

          <AppView>
            <AppView row className="mb-1.5 justify-between">
              <AppText className="text-[13px] font-bold text-foreground-emphasis">
                Full name <AppText className="text-brand">*</AppText>
              </AppText>
              {nameDraft === null && !nameLocked ? (
                <AppPressable onPress={() => setNameDraft(name)} hitSlop={8}>
                  <AppText className="text-[13px] font-bold text-[#2563eb]">Edit</AppText>
                </AppPressable>
              ) : null}
            </AppView>
            <AppView className={nameDraft === null ? 'opacity-70' : ''}>
              <TextField
                variant="outlined"
                value={name}
                onChangeText={setNameDraft}
                editable={nameDraft !== null}
                autoFocus={nameDraft !== null}
                placeholder="As printed on your documents"
                autoCapitalize="words"
                autoCorrect={false}
                leading={<Icon name="person" size={18} tone="icon-subtle" />}
                inputClassName="ml-2"
                hint={
                  nameLocked
                    ? 'Locked after submission. Contact support to change it.'
                    : 'Must match the name on your documents'
                }
              />
            </AppView>
          </AppView>

          {dobLabel ? (
            <AppView className="opacity-60">
              <TextField
                variant="outlined"
                label="Date of birth"
                value={dobLabel}
                editable={false}
                leading={<Icon name="calendar" size={18} tone="icon-subtle" />}
                inputClassName="ml-2"
              />
            </AppView>
          ) : null}

          <AppView className="gap-2">
            <AppText className="text-[13px] font-bold text-foreground-emphasis">
              Gender {hasSelfie ? null : <AppText className="text-brand">*</AppText>}
            </AppText>
            <AppView row className="gap-3">
              {GENDERS.map((g) => {
                const selected = gender === g.value;
                return (
                  <AppPressable
                    key={g.value}
                    onPress={() => setGender(g.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    className={`flex-1 flex-row items-center gap-2 rounded-2xl border-2 px-3 py-3 ${
                      selected ? 'border-brand bg-brand-soft' : 'border-border bg-surface'
                    }`}
                  >
                    <AppView
                      className={`h-4 w-4 rounded-full ${selected ? 'border-[5px] border-brand' : 'border-2 border-border'}`}
                    />
                    <AppText className="text-[14px] font-semibold text-foreground">
                      {g.label}
                    </AppText>
                  </AppPressable>
                );
              })}
            </AppView>
          </AppView>

          <TipsCard
            title="Photo guidelines"
            tips={[
              'Face the camera straight, in good light',
              'No cap, helmet, mask or sunglasses',
              'Only you in the photo, plain background',
            ]}
          />
        </AppScrollView>
      </AppKeyboardAvoidingView>
      <StickyFooter
        label={hasSelfie ? 'Save changes' : 'Submit'}
        onPress={handleSubmit}
        disabled={!canSave || saving}
        loading={saving}
      />
    </SetupScreenLayout>
  );
}
