import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import {
  AppPressable,
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Button,
  Icon,
} from '@/components/ui';
import { signOut, syncOnboardingStatus } from '@/features/auth/use-auth-store';
import { useFleetStore } from '@/features/fleet/use-fleet-store';
import { useFleetCompany } from '@/hooks/use-fleet';
import { SetupScreenLayout } from '@/features/driver/components/setup-screen-layout';
import { useSubmitOnboarding, useVehicleTypes } from '@/hooks/use-driver';
import { getErrorMessage } from '@/lib/api/api-error';

import { StepRow } from '../components';
import {
  buildRegistrationSteps,
  isStepDone,
  snapshotFromStatus,
  useDriverDocuments,
  useOnboardingStatus,
  type RegistrationStep,
} from '../use-registration';
import { usePermissionStatus } from '../use-permission-status';
import { useRegistrationStore } from '../use-registration-store';

/** The driver's registration checklist: one row per document, each with its own status. */
export function RegistrationHubScreen() {
  const router = useRouter();
  // Only the onboarding status and the documents: two light requests, not the full profile.
  const statusQuery = useOnboardingStatus();
  const docsQuery = useDriverDocuments();
  const { data: vehicleTypes = [] } = useVehicleTypes();
  const pickedTypeId = useRegistrationStore.use.vehicleTypeId();
  const fleetDriver = useRegistrationStore.use.fleetDriver();
  const submit = useSubmitOnboarding();
  const permissionStatus = usePermissionStatus();
  // A fleet owner who switched to Rider lands here (their own driver application isn't approved):
  // give them a way back to the fleet dashboard instead of trapping them in driver onboarding.
  const { data: company } = useFleetCompany();
  const isFleetOwner = company?.isRegistered === true;
  const backToFleet = () => {
    useFleetStore.getState().setDashboardRole('owner');
    router.replace('/home');
  };
  const snapshot = statusQuery.data ? snapshotFromStatus(statusQuery.data) : null;
  const onboardingStatus = snapshot?.onboarding.status;
  // Once approved, the app opens on Home again (see the tabs layout).
  useEffect(() => {
    if (onboardingStatus) syncOnboardingStatus(onboardingStatus);
  }, [onboardingStatus]);

  if (!snapshot) {
    return (
      <SetupScreenLayout title="Documents" subtitle="Driver registration">
        <AppView className="flex-1 items-center justify-center p-6">
          {statusQuery.isError ? (
            <>
              <AppText className="text-center text-[15px] text-muted">
                {getErrorMessage(statusQuery.error)}
              </AppText>
              <Button label="Retry" className="mt-4" onPress={() => statusQuery.refetch()} />
            </>
          ) : (
            <AppSpinner size="large" />
          )}
        </AppView>
      </SetupScreenLayout>
    );
  }

  const steps = buildRegistrationSteps(
    snapshot,
    docsQuery.data,
    vehicleTypes,
    pickedTypeId,
    fleetDriver,
  );
  const doneCount = steps.filter((s) => isStepDone(s.state)).length;
  const nextStep = steps.find((s) => !isStepDone(s.state));
  const { onboarding } = snapshot;
  const allSubmitted = !nextStep;

  const banner =
    onboarding.status === 'approved'
      ? {
          title: 'You are approved',
          body: 'All set. Go online from Home to start taking trips.',
          className: 'bg-emerald-500/10',
          icon: 'checkmark.shield.fill' as const,
        }
      : onboarding.status === 'rejected'
        ? {
            title: 'Some documents need changes',
            body: onboarding.rejectionReason ?? 'Fix the steps marked below and submit again.',
            className: 'bg-red-500/10',
            icon: 'exclamationmark.triangle.fill' as const,
          }
        : onboarding.status === 'submitted' || allSubmitted
          ? {
              title: 'Documents under verification',
              body: 'This may take up to 24 hours. Please wait!',
              className: 'bg-brand-soft',
              icon: 'clock' as const,
            }
          : {
              title: 'Complete your registration',
              body: `${doneCount} of ${steps.length} steps done. Upload each document to start driving with RYNO.`,
              className: 'bg-brand-soft',
              icon: 'doc.text.fill' as const,
            };

  // Every step opens its screen, showing what was sent (to look at or update) once submitted.
  // A submitted profile photo opens Profile information (photo + details), not the camera.
  const openStep = (step: RegistrationStep) => {
    if (step.id === 'photo' && step.state !== 'todo') router.push('/register-photo');
    else router.push(step.route);
  };

  const handleSubmit = () =>
    Alert.alert(
      'Submit your application?',
      'By submitting you accept the RYNO partner agreement. Our team will review your documents.',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Accept and submit',
          onPress: () =>
            submit.mutate(undefined, {
              onError: (error) => Alert.alert('Could not submit', getErrorMessage(error)),
            }),
        },
      ],
    );

  const handleLogOut = () =>
    Alert.alert('Log out?', 'Your uploaded documents stay saved. Log in again to continue.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          signOut();
          router.replace('/');
        },
      },
    ]);

  const helpButton = (
    <AppPressable
      onPress={() => router.push('/support')}
      accessibilityRole="button"
      className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1.5"
    >
      <Icon name="questionmark.circle" size={16} tone="foreground" />
      <AppText className="text-[13px] font-bold text-foreground">Help</AppText>
    </AppPressable>
  );

  return (
    <SetupScreenLayout title="Documents" subtitle="Driver registration" right={helpButton}>
      <AppScrollView
        contentContainerClassName="gap-3 px-5 pb-16 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {isFleetOwner ? (
          <AppView className="gap-3 rounded-3xl border border-border bg-surface p-4">
            <AppView row className="items-start gap-3">
              <Icon name="building.2" size={22} tone="brand" />
              <AppText className="flex-1 text-[13px] leading-5 text-foreground-secondary">
                <AppText className="font-bold text-foreground">Rider mode.</AppText> To drive trips
                yourself, finish these steps. Your fleet keeps working meanwhile.
              </AppText>
            </AppView>
            <Button
              variant="outline"
              label="Back to Fleet dashboard"
              onPress={backToFleet}
              size="md"
              textClassName="font-bold"
            />
          </AppView>
        ) : null}

        <AppView className={`mb-2 flex-row items-start gap-3 rounded-3xl p-5 ${banner.className}`}>
          <AppView className="flex-1">
            <AppText className="text-[17px] font-extrabold text-foreground">{banner.title}</AppText>
            <AppText className="mt-1 text-[13px] leading-5 text-foreground-secondary">
              {banner.body}
            </AppText>
            {onboarding.status === 'in_progress' && !allSubmitted ? (
              <AppView className="mt-3 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <AppView
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${Math.round((doneCount / steps.length) * 100)}%` }}
                />
              </AppView>
            ) : null}
          </AppView>
          <Icon name={banner.icon} size={40} tone="brand" />
        </AppView>

        {steps.map((step) => (
          <StepRow
            key={step.id}
            title={step.title}
            detail={step.detail}
            state={step.state}
            optional={step.optional}
            highlighted={step.id === nextStep?.id}
            onPress={() => openStep(step)}
          />
        ))}

        <StepRow
          title="Permissions"
          optional
          detail={
            permissionStatus.allGranted
              ? 'All allowed'
              : permissionStatus.total > 0
                ? `${permissionStatus.grantedCount} of ${permissionStatus.total} allowed`
                : 'Location and camera access'
          }
          state={permissionStatus.allGranted ? 'verified' : 'todo'}
          onPress={() => router.push('/register-permissions')}
        />

        {onboarding.status === 'approved' ? (
          <Button
            variant="brand"
            label="Go to Home"
            className="mt-3"
            onPress={() => router.replace('/home')}
            size="lg"
            textClassName="font-extrabold text-[15px]"
          />
        ) : null}

        {onboarding.canSubmit ? (
          <Button
            variant="brand"
            label="Submit for review"
            className="mt-3"
            loading={submit.isPending}
            onPress={handleSubmit}
            size="lg"
            textClassName="font-extrabold text-[15px]"
          />
        ) : null}

        <AppView row className="mt-3 items-center justify-center gap-1.5">
          <Icon name="lock.fill" size={13} tone="icon-subtle" />
          <AppText className="text-[12px] text-muted">
            Your documents are encrypted and only used for verification.
          </AppText>
        </AppView>

        <AppPressable onPress={handleLogOut} className="mt-2 self-center px-4 py-2">
          <AppText className="text-[13px] font-semibold text-muted underline">Log out</AppText>
        </AppPressable>
      </AppScrollView>
    </SetupScreenLayout>
  );
}
