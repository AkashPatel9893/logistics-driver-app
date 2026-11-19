import { Redirect, Tabs, useRouter, useSegments } from 'expo-router';

import { FloatingTabBar, FloatingTabBarSpacer, type TabName } from '@/components/floating-tab-bar';
import { AppView } from '@/components/ui';
import { useFleetStore } from '@/features/fleet/use-fleet-store';
import { isAwaitingApproval, useAuthStore } from '@/features/auth/use-auth-store';
import { useEffect } from 'react';

import { useDriverProfile } from '@/hooks/use-driver';
import { useActiveJob, useOffers } from '@/hooks/use-jobs';
import {
  setBubbleJob,
  setBubbleOffers,
  setBubbleOnline,
  startBubbleTracking,
} from '@/lib/driver-bubble';
import { useDriverRealtime } from '@/hooks/use-driver-realtime';
import { useLocationReporter } from '@/hooks/use-location-reporter';

/** Background work for a signed-in driver: server pushes and GPS reporting. */
function DriverSession({ userId }: { userId: string }) {
  const { data: profile } = useDriverProfile();
  const isOnline = profile?.isOnline ?? false;
  const { data: activeJob = null } = useActiveJob();
  const { data: offers } = useOffers(isOnline && !activeJob);
  useDriverRealtime(userId);
  useLocationReporter(isOnline);

  // Floating bubble (Android): follows online state, the trip and new requests.
  useEffect(() => startBubbleTracking(), []);
  useEffect(() => setBubbleOnline(isOnline), [isOnline]);
  useEffect(() => setBubbleJob(activeJob), [activeJob]);
  useEffect(() => setBubbleOffers(offers ?? []), [offers]);
  return null;
}

const TAB_NAMES: readonly TabName[] = ['home', 'orders', 'account'];

function isTabName(value: string | undefined): value is TabName {
  return TAB_NAMES.includes(value as TabName);
}

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const isSignedIn = useAuthStore((state) => state.status === 'signIn');
  const isOnboarded = useAuthStore((state) => state.user?.isOnboarded === true);
  const userId = useAuthStore((state) => state.user?.id);
  const lastSegment = segments.at(-1);
  const awaitingApproval = useAuthStore((state) => isAwaitingApproval(state.user));
  const dashboardRole = useFleetStore.use.dashboardRole();
  const activeTab: TabName = isTabName(lastSegment) ? lastSegment : 'home';

  if (!isSignedIn) return <Redirect href="/" />;
  // Unfinished sign-up restarts at its first step, so every later screen has a real back stack.
  if (!isOnboarded) return <Redirect href={'/(auth)/select-city' as any} />;
  // A driver awaiting approval opens on Documents. Decided from the backend status saved with the
  // session (login, /auth/me), so Home never flashes while the profile loads.
  if (awaitingApproval && dashboardRole === 'driver') {
    return <Redirect href={'/registration' as any} />;
  }

  return (
    <AppView className="flex-1">
      {userId ? <DriverSession userId={userId} /> : null}
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
        <Tabs.Screen name="home" />
        <Tabs.Screen name="orders" />
        <Tabs.Screen name="account" />
      </Tabs>
      <FloatingTabBarSpacer />
      <FloatingTabBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab !== activeTab) router.navigate(`/${tab}`);
        }}
      />
    </AppView>
  );
}
