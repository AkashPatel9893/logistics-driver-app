import * as Location from 'expo-location';

import { deviceInfo } from '@/lib/device';

import { request } from './client';
import { ApiError } from './api-error';
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

  getMe: async (signal?: AbortSignal): Promise<User> => {
    try {
      const profile = await request<any>({ url: '/partner/profile', signal });
      return {
        id: profile.id,
        email: '',
        name: [profile.first_name, profile.last_name].filter(Boolean).join(' '),
        phone: profile.phone ?? null,
        dob: profile.date_of_birth ? String(profile.date_of_birth) : null,
        city: profile.city ?? null,
        isOnboarded: true,
      };
    } catch (error: any) {
      if (error?.status === 404 || error?.code === 'DRIVER_PROFILE_NOT_FOUND') {
        return {
          id: '',
          email: '',
          name: '',
          phone: null,
          dob: null,
          city: null,
          isOnboarded: false,
        };
      }
      throw error;
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
        },
      });
    } catch (err: any) {
      if (err?.status === 404 || err?.code === 'DRIVER_PROFILE_NOT_FOUND') {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          throw new ApiError('Allow location access to find your operating area.', 'unknown');
        }
        let location: Location.LocationObject;
        try {
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
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
        res = await request<any>({
          method: 'POST',
          url: '/partner/onboarding/start',
          data: {
            first_name: firstName,
            last_name: lastName,
            date_of_birth: dobFormatted,
            market_code: serviceability.market_code,
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
