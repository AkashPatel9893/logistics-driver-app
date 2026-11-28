import { create } from 'zustand';

import { useFleetStore } from '@/features/fleet/use-fleet-store';
import { authApi } from '@/lib/api/auth';
import { setUnauthorizedHandler } from '@/lib/api/client';
import type { AuthSession, User } from '@/lib/api/models';
import { queryClient } from '@/lib/api/api-provider';
import {
  getToken,
  getUser,
  removeToken,
  setToken,
  setUser as persistUser,
  type TokenType,
} from '@/lib/auth/utils';
import { createSelectors } from '@/lib/create-selectors';
import { kvStorage, STORAGE_KEYS } from '@/lib/storage';

import { useRegistrationStore } from '@/features/registration/use-registration-store';

import { useCityStore } from './use-city-store';

export const DEFAULT_USER_NAME = 'User';

type AuthState = {
  token: TokenType | null;
  status: 'idle' | 'signOut' | 'signIn';
  /** Cached profile; the server (`GET /me`) is the source of truth. */
  user: User | null;
  signIn: (session: AuthSession) => void;
  setUser: (user: User) => void;
  signOut: () => void;
  hydrate: () => void;
  /** Updates only the onboarding fields, e.g. after /auth/me or a profile load. */
  setOnboarding: (patch: { isOnboarded?: boolean; onboardingStatus?: string | null }) => void;
};

const _useAuthStore = create<AuthState>((set, get) => ({
  status: 'idle',
  token: null,
  user: null,

  signIn: (session) => {
    const token = { accessToken: session.accessToken, refreshToken: session.refreshToken };
    setToken(token);
    persistUser(session.user);
    set({ status: 'signIn', token, user: session.user });
  },

  setUser: (user) => {
    const updated = { ...user, phone: user.phone ?? get().user?.phone ?? null };
    persistUser(updated);
    set({ user: updated });
  },

  signOut: () => {
    removeToken();
    persistUser(null);
    // Drop every cached server response so the next account starts clean.
    queryClient.cancelQueries();
    queryClient.clear();
    useCityStore.getState().clear();
    useRegistrationStore.getState().reset();
    useFleetStore.getState().reset();
    set({ status: 'signOut', token: null, user: null });
  },

  setOnboarding: (patch) => {
    const user = get().user;
    if (!user) return;
    const next = { ...user, ...patch };
    if (next.isOnboarded === user.isOnboarded && next.onboardingStatus === user.onboardingStatus) {
      return;
    }
    persistUser(next);
    set({ user: next });
  },

  hydrate: () => {
    const token = getToken();
    const user = getUser();
    if (token && user) set({ status: 'signIn', token, user });
    else get().signOut();
  },
}));

export const useAuthStore = createSelectors(_useAuthStore);

export const signOut = () => _useAuthStore.getState().signOut();

/**
 * The partner taps Log out: end the session on the server too, then sign out here. (signOut alone
 * is for a session the server already refused.)
 */
export function logOut() {
  const accessToken = _useAuthStore.getState().token?.accessToken;
  if (accessToken) void authApi.endSession(accessToken);
  // The next person on this phone must not request a code for this number by mistake.
  kvStorage.delete(STORAGE_KEYS.CACHED_PHONE);
  signOut();
}

/** Driver whose application is not approved yet: the app opens on Documents for them. */
export function isAwaitingApproval(user: User | null): boolean {
  return Boolean(
    user?.isOnboarded && user.onboardingStatus && user.onboardingStatus !== 'APPROVED',
  );
}

/**
 * Keeps the saved status in step with a freshly loaded profile ('approved' | 'submitted' |
 * 'rejected' | 'in_progress'), without another request.
 */
export function syncOnboardingStatus(
  status: 'approved' | 'submitted' | 'rejected' | 'in_progress',
) {
  const current = _useAuthStore.getState().user?.onboardingStatus ?? null;
  const next =
    status === 'approved'
      ? 'APPROVED'
      : status === 'rejected'
        ? 'REJECTED'
        : status === 'submitted'
          ? current === 'UNDER_REVIEW'
            ? current
            : 'SUBMITTED'
          : 'IN_PROGRESS';
  _useAuthStore.getState().setOnboarding({ onboardingStatus: next });
}

let refreshing = false;
/**
 * One light request (GET /auth/me) for the latest onboarding status, e.g. after ops approve the
 * driver. Runs on launch and when the app returns to the foreground.
 */
export async function refreshOnboardingStatus(): Promise<void> {
  if (refreshing || _useAuthStore.getState().status !== 'signIn') return;
  refreshing = true;
  try {
    const me = await authApi.getMe();
    _useAuthStore
      .getState()
      .setOnboarding({ isOnboarded: me.isOnboarded, onboardingStatus: me.onboardingStatus });
    // The backend's record of the mode wins, so a new phone opens in the right one.
    if (me.activeRole) {
      const role = me.activeRole === 'FLEET_OWNER' ? 'owner' : 'driver';
      if (useFleetStore.getState().dashboardRole !== role) {
        useFleetStore.getState().setDashboardRole(role);
      }
    }
  } catch {
    // Offline or server error: keep the saved status; the next refresh tries again.
  } finally {
    refreshing = false;
  }
}
export const hydrateAuth = () => _useAuthStore.getState().hydrate();

// An expired/invalid session anywhere in the app returns the user to login.
setUnauthorizedHandler(() => {
  if (_useAuthStore.getState().status === 'signIn') signOut();
});

export function getDisplayName(user: User | null): string {
  return user?.name?.trim() || DEFAULT_USER_NAME;
}
