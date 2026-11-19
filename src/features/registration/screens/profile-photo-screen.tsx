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
import { goBack } from '@/lib/go-back';
import { queryKeys } from '@/lib/queries/keys';

import { DocumentStatusNote, StickyFooter, TipsCard } from '../components';
import {
  documentState,
  findDocument,
  useDriverDocuments,
  useSubmitDriverDocument,
} from '../use-registration';
import { useSelfieStore } from '../use-selfie-store';

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
  const photo = useSelfieStore((state) => state.uri);
  // Null until the driver taps Edit: then the name shown is the one on the profile.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const name = nameDraft ?? profile?.name ?? '';
  const [gender, setGender] = useState<Gender | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  // The photo arrives from the selfie screen (step 1); forget it once this screen closes.
  useEffect(() => () => useSelfieStore.getState().setUri(null), []);

  const takeSelfie = () => router.push('/register-selfie');
  const dobLabel = profile?.dob ? profile.dob.split('-').reverse().join('/') : null;

  const handleSubmit = async () => {
    if (!photo) return;
    if (name.trim().length < 2) return setError('Enter your full name.');
    if (!gender) return setError('Select your gender.');
    setError(undefined);
    setSaving(true);
    try {
      if (profile?.dob) {
        // Name and gender go together: the backend clears gender on a save without it.
        try {
          const updated = await authApi.updateProfile({
            name: name.trim(),
            dob: profile.dob,
            gender,
          });
          useAuthStore.getState().setUser(updated);
          queryClient.invalidateQueries({ queryKey: queryKeys.profile });
        } catch (e) {
          // Name and DOB lock once the application is submitted; the photo can still be replaced.
          if (!(e instanceof ApiError && e.code === 'PROFILE_LOCKED')) throw e;
        }
      }
      await submit.mutateAsync({ type: 'SELFIE', fileUri: photo });
      goBack(router);
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
              {nameDraft === null ? (
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
                placeholder="As printed on your driving licence"
                autoCapitalize="words"
                autoCorrect={false}
                leading={<Icon name="person" size={18} tone="icon-subtle" />}
                inputClassName="ml-2"
                hint="Must match the name on your driving licence"
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
              Gender <AppText className="text-brand">*</AppText>
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

          {error ? <AppText className="text-[13px] font-medium text-error">{error}</AppText> : null}
        </AppScrollView>
      </AppKeyboardAvoidingView>
      <StickyFooter
        label="Submit"
        onPress={handleSubmit}
        disabled={!photo || !gender || saving}
        loading={saving}
      />
    </SetupScreenLayout>
  );
}
