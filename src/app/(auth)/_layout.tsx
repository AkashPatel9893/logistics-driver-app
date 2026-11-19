import { Redirect, Stack, useSegments } from 'expo-router';

import { useAuthStore } from '@/features/auth/use-auth-store';
import { useCityStore } from '@/features/auth/use-city-store';
import { useStackAnimation } from '@/hooks/use-stack-animation';

export const unstable_settings = {
  anchor: 'index',
};

export default function AuthLayout() {
  const isSignedIn = useAuthStore((state) => state.status === 'signIn');
  const isOnboarded = useAuthStore((state) => state.user?.isOnboarded === true);
  const segments = useSegments();
  const lastSegment = segments.at(-1) as string | undefined;
  const hasCity = useCityStore((state) => state.city !== null);
  const isAllowedAuthRoute =
    lastSegment === 'select-city' ||
    lastSegment === 'choose-role' ||
    lastSegment === 'select-vehicle' ||
    lastSegment === 'onboarding';
  const animation = useStackAnimation();

  if (isSignedIn && isOnboarded) return <Redirect href="/home" />;
  // Signed in but no profile yet: always start at Select City (the saved city shows instantly),
  // so Choose role, Select Vehicle and Driver details each have a screen to go back to.
  if (isSignedIn && (!isAllowedAuthRoute || (!hasCity && lastSegment !== 'select-city'))) {
    return <Redirect href={'/(auth)/select-city' as any} />;
  }
  if (!isSignedIn && isAllowedAuthRoute) return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="select-city" />
      <Stack.Screen name="choose-role" />
      <Stack.Screen name="select-vehicle" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
