import { Redirect, Tabs, usePathname, useRouter, useSegments } from 'expo-router';

import { FloatingTabBar, FloatingTabBarSpacer, type TabName } from '@/components/floating-tab-bar';
import { AppSpinner, AppView } from '@/components/ui';
import { useFleetSetup } from '@/features/fleet/use-fleet-setup';
import { useFleetStore } from '@/features/fleet/use-fleet-store';
import { isAwaitingApproval, useAuthStore } from '@/features/auth/use-auth-store';
import { useEffect, useState, type ReactNode } from 'react';

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

/**
 * Offers already opened, shared app-wide: the tabs can be mounted more than once in the stack, and
 * each copy must not open the same offer again (two screens stacked on top of each other).
 */
const ringedOfferIds = new Set<string>();

/** Background work for a signed-in driver: server pushes and GPS reporting. */
function DriverSession({ userId }: { userId: string }) {
  const { data: profile } = useDriverProfile();
  const isOnline = profile?.isOnline ?? false;
  // The only place that polls these two; every other screen reads the cache.
  const { data: activeJob = null } = useActiveJob({ poll: true });
  const { data: offers } = useOffers(isOnline && !activeJob, { poll: true });
  useDriverRealtime(userId);
  useLocationReporter(isOnline);

  // A new offer takes over the screen like a ringing call, from any tab or screen (not only
  // Home), so it is never missed. Up to two offers can be open (priority first): each rings once.
  const router = useRouter();
  const pathname = usePathname();
  const dashboardRole = useFleetStore.use.dashboardRole();
  useEffect(() => {
    if (activeJob || dashboardRole !== 'driver' || pathname === '/incoming-job') return;
    const next = offers?.find((o) => !ringedOfferIds.has(o.id));
    if (!next) return;
    ringedOfferIds.add(next.id);
    router.push({ pathname: '/incoming-job', params: { offerId: next.id } });
  }, [activeJob, offers, pathname, router, dashboardRole]);

  // Floating bubble (Android): follows online state, the trip and new requests.
  useEffect(() => startBubbleTracking(), []);
  useEffect(() => setBubbleOnline(isOnline), [isOnline]);
  useEffect(() => setBubbleJob(activeJob), [activeJob]);
  useEffect(() => setBubbleOffers(offers ?? []), [offers]);
  return null;
}

/**
 * A fleet owner opens the dashboard only once Fleet setup is complete (company, verified ID and
 * bank account). If the check itself fails, the owner is let through rather than locked out by a
 * network error.
 */
function OwnerSetupGate({ children }: { children: ReactNode }) {
  const setup = useFleetSetup();
  // Spinner only until the first answer: a later refetch must not tear the dashboard down.
  const [settled, setSettled] = useState(false);
  if (!setup.loading && !settled) setSettled(true);
  if (setup.loading && !settled) {
    return (
      <AppView className="flex-1 items-center justify-center bg-background">
        <AppSpinner size="large" />
      </AppView>
    );
  }
  if (!setup.error && !setup.complete) return <Redirect href={'/fleet-setup' as any} />;
  return <>{children}</>;
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

  const dashboard = (
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
  return dashboardRole === 'owner' ? <OwnerSetupGate>{dashboard}</OwnerSetupGate> : dashboard;
}
