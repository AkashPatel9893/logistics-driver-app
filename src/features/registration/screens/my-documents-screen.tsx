import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { AppScrollView, AppSpinner, AppText, AppView, Button } from '@/components/ui';
import { SetupScreenLayout } from '@/features/driver/components/setup-screen-layout';
import { useFleetStore } from '@/features/fleet/use-fleet-store';
import { getErrorMessage } from '@/lib/api/api-error';

import { SubmittedPhotos } from '../components';
import { readSubmittedPhoto } from '../drafts';
import { documentState, findDocument, type StepState } from '../registration-steps';
import { useDriverDocuments } from '../use-registration';

interface DocumentEntry {
  /** Backend document type. */
  type: 'DRIVING_LICENCE' | 'PAN' | 'AADHAAR' | 'SELFIE';
  title: string;
  /** Keys of the photos this phone sent (see drafts.ts). */
  photoKeys: string[];
  /** The registration screen that adds or replaces it; `update` unlocks a verified one. */
  route: Href;
}

const DOCUMENTS: DocumentEntry[] = [
  {
    type: 'DRIVING_LICENCE',
    title: 'Driving licence',
    photoKeys: ['licence.front', 'licence.back'],
    route: '/register-licence?update=1' as Href,
  },
  {
    type: 'PAN',
    title: 'PAN card',
    photoKeys: ['pan.front'],
    route: '/register-identity?update=1&type=PAN' as Href,
  },
  {
    type: 'AADHAAR',
    title: 'Aadhaar card',
    photoKeys: ['aadhaar.front', 'aadhaar.back'],
    route: '/register-identity?update=1&type=AADHAAR' as Href,
  },
  {
    type: 'SELFIE',
    title: 'Profile photo',
    photoKeys: ['profile.photo'],
    route: '/register-photo',
  },
];

const BADGES: Record<StepState, { label: string; box: string; text: string }> = {
  todo: { label: 'Not added', box: 'bg-surface-muted', text: 'text-muted' },
  selected: { label: 'Added', box: 'bg-surface-muted', text: 'text-muted' },
  review: {
    label: 'In review',
    box: 'bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
  },
  verified: {
    label: 'Verified',
    box: 'bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  rejected: { label: 'Fix needed', box: 'bg-red-500/15', text: 'text-red-600 dark:text-red-400' },
};

function StatusBadge({ state }: { state: StepState }) {
  const badge = BADGES[state];
  return (
    <AppView className={`rounded-full px-3 py-1 ${badge.box}`}>
      <AppText className={`text-[12px] font-bold ${badge.text}`}>{badge.label}</AppText>
    </AppView>
  );
}

/** The documents on file, each with its status and its own Update button. */
export function MyDocumentsScreen() {
  const router = useRouter();
  const isOwner = useFleetStore.use.dashboardRole() === 'owner';
  const { data: docs, isPending, isError, error, refetch } = useDriverDocuments();

  // Back from an update: show the new status.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  // A fleet owner is not asked for a licence; it is listed only if they sent one.
  // A rider's profile photo is on My profile.
  const entries = DOCUMENTS.filter(
    (d) =>
      !(isOwner && d.type === 'DRIVING_LICENCE' && !findDocument(docs, d.type)) &&
      !(!isOwner && d.type === 'SELFIE'),
  );

  const openUpdate = (entry: DocumentEntry, state: StepState) => {
    if (state !== 'verified') {
      router.push(entry.route);
      return;
    }
    Alert.alert(
      `Replace ${entry.title}?`,
      'The new one has to be verified again. You may not be able to go online until it is.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', onPress: () => router.push(entry.route) },
      ],
    );
  };

  return (
    <SetupScreenLayout title="My documents" subtitle="What you have sent, and its status">
      <AppScrollView
        contentContainerClassName="gap-3 px-5 pb-16 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {isPending ? <AppSpinner size="large" /> : null}
        {isError && !docs ? (
          <AppView className="items-center gap-3 py-6">
            <AppText className="text-center text-muted">{getErrorMessage(error)}</AppText>
            <Button label="Retry" variant="outline" size="sm" onPress={() => void refetch()} />
          </AppView>
        ) : null}

        {docs
          ? entries.map((entry) => {
              const doc = findDocument(docs, entry.type);
              const state = documentState(doc?.status);
              const photos = state === 'todo' ? [] : entry.photoKeys.map(readSubmittedPhoto);
              const details = [
                doc?.identifierMasked,
                doc?.expiryDate
                  ? `Valid till ${doc.expiryDate.split('-').reverse().join('/')}`
                  : null,
              ].filter(Boolean);
              return (
                <AppView
                  key={entry.type}
                  className="gap-3 rounded-2xl border border-border/80 bg-surface p-4"
                >
                  <AppView row className="items-start justify-between gap-3">
                    <AppView className="flex-1">
                      <AppText className="text-[16px] font-bold text-foreground">
                        {entry.title}
                      </AppText>
                      {details.length > 0 ? (
                        <AppText className="mt-0.5 text-[13px] text-muted">
                          {details.join(' · ')}
                        </AppText>
                      ) : null}
                    </AppView>
                    <StatusBadge state={state} />
                  </AppView>

                  {state === 'rejected' && doc?.rejectionReason ? (
                    <AppText className="text-[13px] text-red-600 dark:text-red-400">
                      {doc.rejectionReason}
                    </AppText>
                  ) : null}

                  {photos.some(Boolean) ? (
                    <SubmittedPhotos uris={photos} />
                  ) : state !== 'todo' ? (
                    <AppText className="text-[12px] text-muted">
                      Sent. This phone has no copy of the photo to show.
                    </AppText>
                  ) : null}

                  <Button
                    variant="outline"
                    size="sm"
                    label={state === 'todo' ? 'Add' : 'Update'}
                    accessibilityLabel={`${state === 'todo' ? 'Add' : 'Update'} ${entry.title}`}
                    onPress={() => openUpdate(entry, state)}
                  />
                </AppView>
              );
            })
          : null}
      </AppScrollView>
    </SetupScreenLayout>
  );
}
