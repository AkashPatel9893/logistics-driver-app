import '@/global.css';
// Registers the background location task before anything else runs.
import '@/lib/background-location';

import { Stack, ThemeProvider } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LocationPermissionGate } from '@/components/location-permission-gate';
import { useThemeConfig } from '@/components/ui';
import { hydrateAuth, refreshOnboardingStatus } from '@/features/auth/use-auth-store';
import { loadSelectedTheme } from '@/hooks/use-selected-theme';
import { useStackAnimation } from '@/hooks/use-stack-animation';
import { APIProvider } from '@/lib/api';

export { ErrorBoundary } from 'expo-router';

loadSelectedTheme();
hydrateAuth();

/** Re-reads the onboarding status (one light request) on launch and on return to the app. */
function OnboardingStatusSync() {
  useEffect(() => {
    refreshOnboardingStatus();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshOnboardingStatus();
    });
    return () => sub.remove();
  }, []);
  return null;
}

function Providers({ children }: { children: ReactNode }) {
  const navigationTheme = useThemeConfig();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <ThemeProvider value={navigationTheme}>
            <APIProvider>{children}</APIProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const animation = useStackAnimation();

  return (
    <Providers>
      <Stack screenOptions={{ headerShown: false, animation }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="support" />
        <Stack.Screen name="support-tickets" />
        <Stack.Screen name="earnings" />
        <Stack.Screen name="incentives" />
        <Stack.Screen name="rate-card" />
        <Stack.Screen name="rewards" />
        <Stack.Screen name="refer" />
        <Stack.Screen name="trip-details" />
        <Stack.Screen name="incoming-job" />
        <Stack.Screen name="active-delivery" />
        <Stack.Screen name="pickup-verification" />
        <Stack.Screen name="drop-verification" />
        <Stack.Screen name="payment-qr" />
        <Stack.Screen name="trip-complete" />
        <Stack.Screen name="customer-chat" />
        <Stack.Screen name="daily-check" />
        <Stack.Screen name="driver-profile" />
        <Stack.Screen name="driver-id-card" />
        <Stack.Screen name="setup-vehicle" />
        <Stack.Screen name="setup-kyc" />
        <Stack.Screen name="setup-bank" />
        <Stack.Screen name="company-details" />
        <Stack.Screen name="add-driver" />
        <Stack.Screen name="vehicle-details" />
        <Stack.Screen name="fleet-setup" />
        <Stack.Screen name="registration" />
        <Stack.Screen name="register-vehicle-type" />
        <Stack.Screen name="register-licence" />
        <Stack.Screen name="register-photo" />
        <Stack.Screen name="register-selfie" />
        <Stack.Screen name="register-identity" />
        <Stack.Screen name="register-permissions" />
      </Stack>
      <LocationPermissionGate />
      <OnboardingStatusSync />
    </Providers>
  );
}
