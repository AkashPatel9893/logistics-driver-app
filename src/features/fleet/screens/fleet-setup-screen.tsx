import { useFocusEffect, useRouter } from 'expo-router';
import { switchDashboardRole } from '@/features/fleet/switch-role';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl } from 'react-native';

import {
  AppPressable,
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  Icon,
} from '@/components/ui';
import { logOut } from '@/features/auth/use-auth-store';
import { SetupScreenLayout } from '@/features/driver/components/setup-screen-layout';
import { StepRow } from '@/features/registration/components';
import { useAutoStartStep } from '@/features/registration/use-auto-start-step';
import { isStepDone } from '@/features/registration/registration-steps';

import { useFleetSetup, type FleetSetupStep } from '../use-fleet-setup';

/** The checklist a fleet owner finishes before the fleet dashboard opens. */
export function FleetSetupScreen() {
  const router = useRouter();
  const setup = useFleetSetup();
  const [refreshing, setRefreshing] = useState(false);

  // Back from a step: re-check, so a finished step turns green without a pull.
  const { refetch } = setup;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  // Everything done: open the dashboard. Only while this list is on screen: the last step's data
  // arrives while that step is still open, and redirecting then would replace the step instead,
  // leaving this list stuck underneath.
  useFocusEffect(
    useCallback(() => {
      if (setup.complete) router.replace('/home');
    }, [setup.complete, router]),
  );

  // Right after sign-up the first pending step opens by itself.
  const firstPending = setup.steps.find((s) => !isStepDone(s.state));
  const holding = useAutoStartStep(!setup.loading && setup.steps.length > 0, firstPending?.route);

  const openStep = (step: FleetSetupStep) => {
    router.push(step.route as never);
  };

  const switchToRider = () => {
    switchDashboardRole('driver');
    router.replace('/home');
  };

  // Wrong number, or not now: the owner can always sign out from setup.
  const handleLogOut = () =>
    Alert.alert('Log out?', 'Your details and uploads stay saved. Log in again to continue.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          logOut();
          router.replace('/');
        },
      },
    ]);

  const done = setup.steps.filter(
    (s) => s.state === 'verified' || (s.id === 'bank' && s.state === 'review'),
  ).length;

  if (holding && !setup.error) {
    return (
      <AppView className="flex-1 items-center justify-center bg-background">
        <FocusAwareStatusBar />
        <AppSpinner size="large" />
      </AppView>
    );
  }

  return (
    <SetupScreenLayout
      title="Set up your fleet"
      subtitle="Finish these steps to open your dashboard"
      right={
        <AppPressable
          onPress={() => router.push('/support')}
          accessibilityLabel="Help and support"
          className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
        >
          <Icon name="questionmark.circle" size={20} tone="icon-strong" />
        </AppPressable>
      }
    >
      <AppScrollView
        contentContainerClassName="gap-3 px-5 pb-16 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void setup.refetch().finally(() => setRefreshing(false));
            }}
          />
        }
      >
        {setup.loading ? <AppSpinner size="large" /> : null}
        {setup.error && !setup.loading ? (
          <AppView className="items-center gap-3 py-6">
            <AppText className="text-center text-muted">
              Could not load your setup. Try again.
            </AppText>
            <Button
              label="Retry"
              variant="outline"
              size="sm"
              onPress={() => void setup.refetch()}
            />
          </AppView>
        ) : null}

        {setup.steps.length > 0 ? (
          <>
            <AppView className="gap-2 rounded-3xl border border-border bg-card p-4">
              <AppText className="text-[16px] font-extrabold text-foreground">
                Complete your registration
              </AppText>
              <AppText className="text-[13px] leading-5 text-muted">
                {done} of {setup.steps.length} steps done. Photo and ID are checked by the Ryno
                team.
              </AppText>
              <AppView className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
                <AppView
                  className="h-2 rounded-full bg-brand"
                  style={{ width: `${Math.round((done / setup.steps.length) * 100)}%` }}
                />
              </AppView>
            </AppView>

            {setup.steps.map((step) => (
              <StepRow
                key={step.id}
                title={step.title}
                detail={step.detail}
                state={step.state}
                highlighted={step.id === setup.nextStepId}
                onPress={() => openStep(step)}
              />
            ))}

            {setup.riderApproved ? (
              <Button
                variant="outline"
                label="Use Rider mode instead"
                className="mt-3"
                onPress={switchToRider}
              />
            ) : null}
          </>
        ) : null}

        {!setup.loading ? (
          <AppPressable
            onPress={handleLogOut}
            accessibilityRole="button"
            className="mt-2 self-center px-4 py-2"
          >
            <AppText className="text-[13px] font-semibold text-muted underline">Log out</AppText>
          </AppPressable>
        ) : null}
      </AppScrollView>
    </SetupScreenLayout>
  );
}
