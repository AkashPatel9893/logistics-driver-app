import '@/global.css';

import { Stack, ThemeProvider } from 'expo-router';
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useThemeConfig } from '@/components/ui';
import { hydrateAuth } from '@/features/auth/use-auth-store';
import { loadSelectedTheme } from '@/hooks/use-selected-theme';
import { useStackAnimation } from '@/hooks/use-stack-animation';
import { APIProvider } from '@/lib/api';

export { ErrorBoundary } from 'expo-router';

loadSelectedTheme();
hydrateAuth();

function Providers({ children }: { children: ReactNode }) {
  const navigationTheme = useThemeConfig();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={navigationTheme}>
          <APIProvider>{children}</APIProvider>
        </ThemeProvider>
      </SafeAreaProvider>
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
        <Stack.Screen name="earnings" />
        <Stack.Screen name="incoming-job" />
        <Stack.Screen name="active-delivery" />
        <Stack.Screen name="pickup-verification" />
        <Stack.Screen name="drop-verification" />
        <Stack.Screen name="payment-qr" />
        <Stack.Screen name="trip-complete" />
        <Stack.Screen name="customer-chat" />
        <Stack.Screen name="daily-check" />
        <Stack.Screen name="driver-profile" />
        <Stack.Screen name="setup-vehicle" />
        <Stack.Screen name="setup-kyc" />
        <Stack.Screen name="setup-bank" />
      </Stack>
    </Providers>
  );
}
