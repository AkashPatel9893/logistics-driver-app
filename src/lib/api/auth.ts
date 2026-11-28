import * as Location from 'expo-location';

import { deviceInfo } from '@/lib/device';

import { request } from './client';
import { API_BASE_URL } from './config';
import { ApiError } from './api-error';
import { setToken } from '../auth/utils';
import type { AuthSession, LanguageOption, OtpChallenge, UpdateProfileInput, User } from './models';

/** E.164 form of a 10-digit Indian mobile number (the backend logs in by phone). */
function toPhone(mobile: string): string {
  return `+91${mobile.replace(/\D/g, '').slice(-10)}`;
}

/** Operating market at the phone's current location (fallback when no city was chosen). */
async function marketFromLocation(): Promise<string> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new ApiError('Allow location access to find your operating area.', 'unknown');
  }
  let location: Location.LocationObject;
  try {
    // Only the city is needed: a recent cached fix is enough, and avoids waiting
    // for a fresh GPS reading that may never come indoors.
    location =
      (await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000 }).catch(() => null)) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  } catch {
    throw new ApiError(
      'Could not determine your location. Check location services and try again.',
      'unknown',
    );
  }
  const serviceability = await request<{ serviceable: boolean; market_code: string | null }>({
    url: '/serviceability',
    params: { lat: location.coords.latitude, lng: location.coords.longitude },
  });
  if (!serviceability.serviceable || !serviceability.market_code) {
    throw new ApiError('Your current location is outside our service area.', 'unknown');
  }
  return serviceability.market_code;
}

export type PartnerRole = 'RIDER' | 'FLEET_OWNER';

/** The partner app's two modes, as the backend names them. */
export function toPartnerRole(role: 'driver' | 'owner'): PartnerRole {
  return role === 'owner' ? 'FLEET_OWNER' : 'RIDER';
}

export const authApi = {
  /**
   * Ends this session on the server (`POST /auth/logout`), so the tokens stop working. Sent with
   * the token given (the app has already forgotten it) and never retried or refreshed: signing out
   * must not wait on the network, and a failure only leaves a token the phone no longer has.
   */
  endSession: async (accessToken: string): Promise<void> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ all_sessions: false }),
        signal: controller.signal,
      });
    } catch {
      // Offline or timed out: the phone is signed out either way.
    } finally {
      clearTimeout(timer);
    }
  },

  sendOtp: async (identifier: string): Promise<OtpChallenge> => {
    const phone = toPhone(identifier);
    const res = await request<any>({
      method: 'POST',
      url: '/auth/otp/request',
      data: { phone, app_type: 'PARTNER' },
    });
    return {
      otpLength: 6,
      resendInSeconds: 30,
      expiresInSeconds: res?.expires_in_seconds ?? 300,
    };
  },

  verifyOtp: async (
    identifier: string,
    otp: string,
    savedRole?: PartnerRole | null,
  ): Promise<AuthSession> => {
    const phone = toPhone(identifier);
    const res = await request<any>({
      method: 'POST',
      url: '/auth/otp/verify',
      data: {
        phone,
        app_type: 'PARTNER',
        code: otp,
        device: deviceInfo(),
        // Only when this phone has a saved choice: never guess for someone who has not chosen.
        ...(savedRole ? { selected_role: savedRole } : {}),
      },
    });
    setToken({ accessToken: res.access_token, refreshToken: res.refresh_token });
    // The login response already says whether a driver profile exists and its onboarding status,
    // so a first-time driver needs no extra request. The profile is read only for its id and DOB.
    const authUser = res.user ?? {};
    const hasProfile = authUser.profile_complete === true;
    const profile = hasProfile
      ? await request<any>({ url: '/partner/profile' }).catch(() => null)
      : null;
    return {
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      selectedRole: res.selected_role ?? null,
      fleetInvite:
        authUser.registered_via === 'FLEET_INVITE' && authUser.invited_by?.company_name
          ? { companyName: String(authUser.invited_by.company_name) }
          : null,
      user: {
        id: profile?.id ?? authUser.id ?? '',
        email: '',
        name:
          [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
          authUser.name ||
          '',
        phone,
        dob: profile?.date_of_birth ? String(profile.date_of_birth) : null,
        city: profile?.city ?? null,
        isOnboarded: hasProfile,
        onboardingStatus: authUser.onboarding_status ?? null,
      },
    };
  },

  /** Light status check (one request): profile exists? onboarding status? */
  getMe: async (
    signal?: AbortSignal,
  ): Promise<{
    isOnboarded: boolean;
    onboardingStatus: string | null;
    name: string | null;
    /** The mode the backend has on record (`active_role`), or null when none is set. */
    activeRole: PartnerRole | null;
  }> => {
    const res = await request<any>({ url: '/auth/me', signal });
    const me = res?.user ?? res ?? {};
    const role = me.active_role ?? me.selected_role;
    return {
      isOnboarded: me.profile_complete === true,
      onboardingStatus: me.onboarding_status ?? null,
      name: me.name ?? null,
      activeRole: role === 'RIDER' || role === 'FLEET_OWNER' ? role : null,
    };
  },

  /**
   * Tells the backend which mode the partner is in (PUT /auth/active-role). A failure is not an
   * error for the caller: the phone still remembers the choice.
   */
  setActiveRole: async (role: PartnerRole): Promise<void> => {
    try {
      await request<any>({ method: 'PUT', url: '/auth/active-role', data: { role } });
    } catch {
      // Offline or rejected: the local choice stands.
    }
  },

  updateProfile: async (input: UpdateProfileInput): Promise<User> => {
    const name = input.name?.trim();
    if (!name || !input.dob) throw new ApiError('Enter your name and date of birth.', 'unknown');
    const spaceIdx = name.indexOf(' ');
    const firstName = spaceIdx > 0 ? name.slice(0, spaceIdx) : name;
    const lastName = spaceIdx > 0 ? name.slice(spaceIdx + 1) : null;
    const parts = input.dob.split(/[/.-]/).map((part) => part.trim());
    if (parts.length !== 3) throw new ApiError('Enter a valid date of birth.', 'unknown');
    const [day, month, year] = parts[0].length === 4 ? [parts[2], parts[1], parts[0]] : parts;
    const dobFormatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const date = new Date(`${dobFormatted}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dobFormatted) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== dobFormatted
    ) {
      throw new ApiError('Enter a valid date of birth.', 'unknown');
    }

    let res: any;
    try {
      res = await request<any>({
        method: 'PUT',
        url: '/partner/profile',
        data: {
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dobFormatted,
          ...(input.gender ? { gender: input.gender } : {}),
        },
      });
    } catch (err: any) {
      if (err?.status === 404 || err?.code === 'DRIVER_PROFILE_NOT_FOUND') {
        // The city chosen on Select City; the phone's location only as a fallback.
        const marketCode = input.marketCode ?? (await marketFromLocation());
        res = await request<any>({
          method: 'POST',
          url: '/partner/onboarding/start',
          data: {
            first_name: firstName,
            last_name: lastName,
            date_of_birth: dobFormatted,
            ...(input.gender ? { gender: input.gender } : {}),
            market_code: marketCode,
          },
        });
      } else {
        throw err;
      }
    }

    const fullName = [res.first_name, res.last_name].filter(Boolean).join(' ') || name;
    return {
      id: res.id ?? res.driver_id,
      email: res.email ?? '',
      name: fullName,
      phone: res.phone_masked ?? null,
      dob: res.date_of_birth ? String(res.date_of_birth) : dobFormatted,
      city: res.city ?? null,
      isOnboarded: true,
      onboardingStatus: res.onboarding_status ?? null,
    };
  },

  getLanguages: async (signal?: AbortSignal): Promise<LanguageOption[]> => {
    try {
      const res = await request<any[]>({ url: '/config/languages', signal });
      if (Array.isArray(res) && res.length > 0) {
        return res.map((l: any) => ({
          code: l.code,
          label: l.label,
          nativeLabel: l.native_label ?? l.nativeLabel ?? l.label,
        }));
      }
    } catch {}
    return [
      { code: 'en', label: 'English', nativeLabel: 'English' },
      { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
      { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
    ];
  },
};
