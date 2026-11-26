import { useRouter } from 'expo-router';

import { AppPressable, AppText, AppView, Icon } from '@/components/ui';
import { useVehicleTypes } from '@/hooks/use-driver';
import type { DriverProfile } from '@/lib/api/models';

import { StepStatusIcon } from './components';
import { buildRegistrationSteps, isStepDone, snapshotFromProfile } from './registration-steps';
import { useDriverDocuments, useFleetAssignedVehicle } from './use-registration';
import { useRegistrationStore } from './use-registration-store';

/** Home card for a driver who cannot go online yet: progress plus a link to the Documents screen. */
export function RegistrationProgressCard({ profile }: { profile: DriverProfile }) {
  const router = useRouter();
  const { data: docs } = useDriverDocuments();
  const { data: vehicleTypes = [] } = useVehicleTypes();
  const { data: fleetVehicle = null } = useFleetAssignedVehicle();
  const pickedTypeId = useRegistrationStore.use.vehicleTypeId();
  const fleetDriver = useRegistrationStore.use.fleetDriver();
  const steps = buildRegistrationSteps(
    snapshotFromProfile(profile),
    docs,
    vehicleTypes,
    pickedTypeId,
    fleetDriver,
    fleetVehicle,
  );
  const done = steps.filter((s) => isStepDone(s.state)).length;
  const next = steps.find((s) => !isStepDone(s.state));
  const { onboarding } = profile;

  const headline =
    onboarding.status === 'rejected'
      ? 'Some documents need changes'
      : onboarding.status === 'submitted'
        ? 'Documents under verification'
        : next
          ? 'Complete your registration'
          : onboarding.canSubmit
            ? 'Ready to submit'
            : 'Documents under verification';
  const body =
    onboarding.status === 'rejected'
      ? (onboarding.rejectionReason ?? 'Fix the marked documents and submit again.')
      : onboarding.status === 'submitted'
        ? 'This may take up to 24 hours. You can go online once approved.'
        : next
          ? `Next: ${next.title}`
          : onboarding.canSubmit
            ? 'All documents are uploaded. Submit your application for review.'
            : 'This may take up to 24 hours.';

  return (
    <AppPressable
      onPress={() => router.push('/registration')}
      pressScale={0.98}
      accessibilityRole="button"
      className="gap-3 rounded-[24px] border border-border/80 bg-surface p-4 shadow-sm"
    >
      <AppView row className="items-start gap-3">
        <AppView className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft">
          <Icon name="doc.text.fill" size={22} tone="brand" />
        </AppView>
        <AppView className="flex-1">
          <AppText className="text-[16px] font-extrabold text-foreground">{headline}</AppText>
          <AppText className="mt-0.5 text-[13px] text-muted" numberOfLines={2}>
            {body}
          </AppText>
        </AppView>
        <AppText className="text-[13px] font-bold text-brand">
          {done}/{steps.length}
        </AppText>
      </AppView>

      <AppView row className="gap-1.5">
        {steps.map((s) => (
          <AppView
            key={s.id}
            className={`h-1.5 flex-1 rounded-full ${
              s.state === 'rejected'
                ? 'bg-red-500'
                : s.state === 'verified' || s.state === 'selected'
                  ? 'bg-emerald-500'
                  : s.state === 'review'
                    ? 'bg-amber-500'
                    : 'bg-border'
            }`}
          />
        ))}
      </AppView>

      <AppView row className="items-center justify-between rounded-full bg-brand px-4 py-2.5">
        <AppView row className="gap-2">
          {next ? null : <StepStatusIcon state="review" />}
          <AppText className="text-[14px] font-bold text-brand-foreground">
            {next ? 'Continue registration' : 'View documents'}
          </AppText>
        </AppView>
        <Icon name="chevron.right" size={16} tone="brand-foreground" />
      </AppView>
    </AppPressable>
  );
}
