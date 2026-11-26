import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import {
  AppImage,
  AppPressable,
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Avatar,
  Button,
} from '@/components/ui';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { readSubmittedPhoto } from '@/features/registration/drafts';
import { documentState, findDocument } from '@/features/registration/registration-steps';
import { useDriverDocuments } from '@/features/registration/use-registration';
import { useDriverProfile, useUpdateGender } from '@/hooks/use-driver';
import { getErrorMessage } from '@/lib/api/api-error';
import type { Gender } from '@/lib/api/models';

import { SetupScreenLayout } from '../components/setup-screen-layout';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

const PHOTO_STATUS: Record<string, string> = {
  verified: 'Photo verified',
  review: 'New photo in review',
  rejected: 'Photo needs to be taken again',
};

/** ISO (YYYY-MM-DD) → DD/MM/YYYY. */
function formatDate(iso: string | null): string {
  return iso ? iso.split('-').reverse().join('/') : '—';
}

function DetailRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <AppView className="gap-0.5 border-b border-border/60 px-4 py-3.5">
      <AppText className="text-[12px] font-medium text-muted">{label}</AppText>
      <AppText className="text-[16px] font-bold text-foreground">{value}</AppText>
      {note ? <AppText className="text-[12px] text-muted">{note}</AppText> : null}
    </AppView>
  );
}

/** A rider's personal details, and the few they can change here. */
export function MyProfileScreen() {
  const router = useRouter();
  const { data: profile, isError, error, refetch } = useDriverProfile();
  const { data: docs } = useDriverDocuments();
  const updateGender = useUpdateGender();
  // Null until a different option is tapped.
  const [picked, setPicked] = useState<Gender | null>(null);
  // The login number: the profile response does not carry it.
  const signedInPhone = useAuthStore.use.user()?.phone;

  if (!profile) {
    return (
      <SetupScreenLayout title="My profile" subtitle="Your personal details">
        <AppView className="flex-1 items-center justify-center gap-3 p-6">
          {isError ? (
            <>
              <AppText className="text-center text-muted">{getErrorMessage(error)}</AppText>
              <Button label="Retry" variant="outline" onPress={() => void refetch()} />
            </>
          ) : (
            <AppSpinner size="large" />
          )}
        </AppView>
      </SetupScreenLayout>
    );
  }

  const loginPhone = signedInPhone || profile.phone;
  const photoState = documentState(findDocument(docs, 'SELFIE')?.status);
  const photo = readSubmittedPhoto('profile.photo');
  const gender = picked ?? profile.gender;
  const genderChanged = picked !== null && picked !== profile.gender;
  const isLocked = (field: string) => profile.lockedFields.includes(field);
  const nameLocked = isLocked('first_name') || isLocked('last_name');
  const dobLocked = isLocked('date_of_birth');

  const openPhoto = () => router.push('/register-photo');
  const changePhoto = () => {
    if (photoState !== 'verified') return openPhoto();
    Alert.alert(
      'Change your photo?',
      'The new one has to be verified again. You may not be able to go online until it is.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Change', onPress: openPhoto },
      ],
    );
  };

  const saveGender = () => {
    if (!picked) return;
    updateGender.mutate(picked, {
      onSuccess: () => setPicked(null),
      onError: (e) => Alert.alert('Could not save', getErrorMessage(e)),
    });
  };

  return (
    <SetupScreenLayout title="My profile" subtitle="Your personal details">
      <AppScrollView
        contentContainerClassName="gap-5 px-5 pb-16 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <AppView className="items-center gap-2">
          {photo ? (
            <AppImage source={{ uri: photo }} contentFit="cover" className="size-28 rounded-full" />
          ) : (
            <Avatar name={profile.name} size="xl" />
          )}
          {PHOTO_STATUS[photoState] ? (
            <AppText className="text-[12px] text-muted">{PHOTO_STATUS[photoState]}</AppText>
          ) : null}
          <Button variant="outline" size="sm" label="Change photo" onPress={changePhoto} />
        </AppView>

        <AppView className="overflow-hidden rounded-2xl border border-border/80 bg-surface">
          <DetailRow
            label="Full name"
            value={profile.name || '—'}
            note={nameLocked ? 'Locked after your application was submitted' : undefined}
          />
          <DetailRow
            label="Date of birth"
            value={formatDate(profile.dob)}
            note={dobLocked ? 'Locked after your application was submitted' : undefined}
          />
          <DetailRow label="Mobile number" value={loginPhone ?? '—'} note="You log in with it" />
        </AppView>

        <AppView className="gap-2.5">
          <AppText className="px-1 text-[13px] font-bold text-foreground-emphasis">Gender</AppText>
          <AppView row className="gap-3">
            {GENDERS.map((g) => {
              const selected = gender === g.value;
              return (
                <AppPressable
                  key={g.value}
                  onPress={() => setPicked(g.value)}
                  disabled={updateGender.isPending}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  className={`flex-1 items-center rounded-2xl border-2 py-3 ${
                    selected ? 'border-brand bg-brand-soft' : 'border-border bg-surface'
                  }`}
                >
                  <AppText className="text-[14px] font-semibold text-foreground">{g.label}</AppText>
                </AppPressable>
              );
            })}
          </AppView>
          {genderChanged ? (
            <Button
              variant="brand"
              label="Save gender"
              loading={updateGender.isPending}
              onPress={saveGender}
            />
          ) : null}
        </AppView>
      </AppScrollView>
    </SetupScreenLayout>
  );
}
