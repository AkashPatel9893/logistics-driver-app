import { deviceInfo } from '@/lib/device';

import { request } from './client';
import { setToken } from '../auth/utils';
import type { AuthSession, LanguageOption, OtpChallenge, UpdateProfileInput, User } from './models';

/** E.164 form of a 10-digit Indian mobile number (the backend logs in by phone). */
function toPhone(mobile: string): string {
  return `+91${mobile.replace(/\D/g, '').slice(-10)}`;
}

export const authApi = {
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

  verifyOtp: async (identifier: string, otp: string): Promise<AuthSession> => {
    const phone = toPhone(identifier);
    const res = await request<any>({
      method: 'POST',
      url: '/auth/otp/verify',
      data: {
        phone,
        app_type: 'PARTNER',
        code: otp,
        device: deviceInfo(),
      },
    });
    setToken({ accessToken: res.access_token, refreshToken: res.refresh_token });
    // A first-time driver has no partner profile yet and must fill in their details.
    const profile = await request<any>({ url: '/partner/profile' }).catch((error: any) => {
      if (error?.status === 404 || error?.code === 'DRIVER_PROFILE_NOT_FOUND') return null;
      throw error;
    });
    return {
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      user: {
        id: profile?.id ?? res.user?.id ?? '',
        email: '',
        name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' '),
        phone,
        dob: profile?.date_of_birth ? String(profile.date_of_birth) : null,
        city: null,
        isOnboarded: profile !== null,
      },
    };
  },

  updateProfile: async (input: UpdateProfileInput): Promise<User> => {
    const name = (input.name || 'Partner Driver').trim();
    const spaceIdx = name.indexOf(' ');
    const firstName = spaceIdx > 0 ? name.slice(0, spaceIdx) : name;
    const lastName = spaceIdx > 0 ? name.slice(spaceIdx + 1) : null;

    let dobFormatted = '1990-01-01';
    if (input.dob) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(input.dob)) {
        dobFormatted = input.dob;
      } else {
        const parts = input.dob.split(/[/.-]/).map((p) => p.trim());
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            dobFormatted = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          } else if (parts[0].length === 4) {
            dobFormatted = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
        }
      }
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
        },
      });
    } catch (err: any) {
      if (err?.status === 404 || err?.code === 'DRIVER_PROFILE_NOT_FOUND') {
        res = await request<any>({
          method: 'POST',
          url: '/partner/onboarding/start',
          data: {
            first_name: firstName,
            last_name: lastName,
            date_of_birth: dobFormatted,
            market_code: 'DEV',
          },
        });
      } else {
        throw err;
      }
    }

    const fullName =
      [res.first_name, res.last_name].filter(Boolean).join(' ') || (input.name ?? 'Partner Driver');
    return {
      id: res.id ?? res.driver_id ?? 'drv-1',
      email: res.email ?? '',
      name: fullName,
      phone: res.phone_masked ?? null,
      dob: res.date_of_birth ? String(res.date_of_birth) : (input.dob ?? '1990-01-01'),
      city: input.city ?? null,
      isOnboarded: true,
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
