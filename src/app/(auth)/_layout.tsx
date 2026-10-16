import { Redirect, Stack, useSegments } from 'expo-router';

import { useAuthStore } from '@/features/auth/use-auth-store';
import { useStackAnimation } from '@/hooks/use-stack-animation';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function AuthLayout() {
  const isSignedIn = useAuthStore((state) => state.status === 'signIn');
  const isOnboarded = useAuthStore((state) => state.user?.isOnboarded === true);
  const segments = useSegments();
  const lastSegment = segments.at(-1) as string | undefined;
  const isAllowedAuthRoute = lastSegment === 'onboarding' || lastSegment === 'choose-role';
  const animation = useStackAnimation();

  if (isSignedIn && isOnboarded) return <Redirect href="/home" />;
  // Signed in but no profile yet: role selection or onboarding is required.
  if (isSignedIn && !isAllowedAuthRoute) return <Redirect href={'/(auth)/choose-role' as any} />;
  if (!isSignedIn && isAllowedAuthRoute) return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="choose-role" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
