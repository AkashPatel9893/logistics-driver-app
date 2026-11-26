import { useCanGoBack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppKeyboardAvoidingView,
  AppScrollView,
  AppView,
  FocusAwareStatusBar,
  LiquidGlassBackButton,
} from '@/components/ui';
import { useFleetStore } from '@/features/fleet/use-fleet-store';
import { goBack } from '@/lib/go-back';

import { DriverDetailsForm } from './components/driver-details-form';
import { FleetSignupForm } from './components/fleet-signup-form';

/** Last sign-up screen; the form depends on the role picked on Choose role. */
export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // This screen's own stack: no back button when it is the first screen (e.g. after a restart).
  const canGoBack = useCanGoBack();
  const role = useFleetStore.use.dashboardRole();

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <AppKeyboardAvoidingView>
        <AppScrollView
          // Padding on the content, not the scroll view: padding the view itself shifts it down
          // and cuts the bottom of the form off by the same amount.
          contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 48 }}
          contentContainerClassName="px-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AppView className="mb-4 min-h-[48px] justify-center">
            {canGoBack ? <LiquidGlassBackButton onPress={() => goBack(router)} /> : null}
          </AppView>

          {role === 'driver' ? <DriverDetailsForm /> : <FleetSignupForm />}
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </AppView>
  );
}
