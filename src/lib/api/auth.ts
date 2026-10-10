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
        device: { device_uuid: 'expo-driver-client-1', platform: 'WEB' },
      },
    });
    const session: AuthSession = {
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      user: {
        id: res.user?.id ?? 'drv-1',
        email: '',
        name: 'Partner Driver',
        phone,
        dob: '01 / 01 / 1990',
        city: 'Dev City',
        isOnboarded: true,
      },
    };
    setToken({ accessToken: session.accessToken, refreshToken: session.refreshToken });
    return session;
  },

  getMe: async (signal?: AbortSignal): Promise<User> => {
    try {
      const res = await request<any>({ url: '/partner/profile', signal });
      const fullName =
        [res.first_name, res.last_name].filter(Boolean).join(' ') || 'Partner Driver';
      return {
        id: res.id ?? res.driver_id ?? res.user_id ?? 'drv-1',
        email: res.email ?? '',
        name: fullName,
        phone: res.phone_masked ?? null,
        dob: res.date_of_birth ? String(res.date_of_birth) : '01 / 01 / 1990',
        city: 'Dev City',
        isOnboarded: res.onboarding_status === 'APPROVED',
      };
    } catch {
      return {
        id: 'drv-me',
        email: '',
        name: 'Partner Driver',
        phone: null,
        dob: '01 / 01 / 1990',
        city: 'Dev City',
        isOnboarded: false,
      };
    }
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
          gender: 'MALE',
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
            gender: 'MALE',
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
      city: input.city ?? 'Dev City',
      isOnboarded: res.onboarding_status === 'APPROVED',
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
