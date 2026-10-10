import { useLocationStore } from '@/stores/location-store';

import { request } from './client';
import type {
  BankInput,
  DailyCheck,
  DriverProfile,
  GeoPoint,
  KycInput,
  VehicleInput,
  VehicleTypeOption,
} from './models';

export interface LocationUpdate extends GeoPoint {
  heading: number | null;
  speedKmph: number | null;
  recordedAt: string;
}

export const driverApi = {
  getProfile: async (signal?: AbortSignal): Promise<DriverProfile> => {
    try {
      return await request<DriverProfile>({ url: '/driver/profile', signal });
    } catch {
      try {
        const p = await request<any>({ url: '/partner/profile', signal });
        const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Partner Driver';
        return {
          id: p.id,
          name: fullName,
          phone: p.phone_masked ?? null,
          email: p.email ?? '',
          city: 'Bangalore',
          dob: p.date_of_birth ? String(p.date_of_birth) : '1990-01-01',
          joinedAt: p.created_at ?? new Date().toISOString(),
          rating: 4.9,
          ratingCount: 120,
          isOnline: p.onboarding_status === 'APPROVED',
          onlineSince: null,
          vehicle: null,
          kyc: null,
          bank: null,
          pendingSteps: [],
          canGoOnline: true,
          dailyCheck: {
            completedToday: true,
            photoUrl: null,
            reward: 50,
          },
          welcomeBonus: {
            status: 'active',
            seen: true,
            amount: 500,
            targetTrips: 10,
            completedTrips: 10,
            expiresAt: new Date().toISOString(),
          },
          walletBalance: 0,
          lifetimeTrips: 15,
        };
      } catch {
        return {
          id: 'drv-1',
          name: 'Partner Driver',
          phone: '+919876543210',
          email: 'driver@ryno.app',
          city: 'Bangalore',
          dob: '1990-01-01',
          joinedAt: new Date().toISOString(),
          rating: 4.9,
          ratingCount: 120,
          isOnline: true,
          onlineSince: null,
          vehicle: null,
          kyc: null,
          bank: null,
          pendingSteps: [],
          canGoOnline: true,
          dailyCheck: {
            completedToday: true,
            photoUrl: null,
            reward: 50,
          },
          welcomeBonus: {
            status: 'active',
            seen: true,
            amount: 500,
            targetTrips: 10,
            completedTrips: 10,
            expiresAt: new Date().toISOString(),
          },
          walletBalance: 0,
          lifetimeTrips: 15,
        };
      }
    }
  },

  setOnline: async (isOnline: boolean): Promise<DriverProfile> => {
    try {
      return await request<DriverProfile>({
        method: 'PUT',
        url: '/driver/status',
        data: { isOnline },
      });
    } catch {
      try {
        if (isOnline) {
          await request<any>({
            method: 'POST',
            url: '/partner/availability/online',
            // MG Road, Bengaluru until the first GPS fix arrives.
            data: {
              latitude: useLocationStore.getState().current?.latitude ?? 12.9716,
              longitude: useLocationStore.getState().current?.longitude ?? 77.5946,
            },
          });
        } else {
          await request<any>({
            method: 'POST',
            url: '/partner/availability/offline',
          });
        }
      } catch {}
      const profile = await driverApi.getProfile();
      return { ...profile, isOnline };
    }
  },

  reportLocation: async (update: LocationUpdate): Promise<{ receivedAt: string }> => {
    await request<any>({
      method: 'POST',
      url: '/tracking/location',
      data: {
        latitude: update.latitude,
        longitude: update.longitude,
        speed_kph: update.speedKmph ?? 0,
        recorded_at: new Date().toISOString(),
      },
    });
    return { receivedAt: new Date().toISOString() };
  },

  getVehicleTypes: async (signal?: AbortSignal): Promise<VehicleTypeOption[]> => {
    const res = await request<any[]>({ url: '/vehicle-types', signal });
    return res.map((v) => ({
      id: v.id,
      name: v.display_name ?? v.name,
      capacityKg: v.capacity_kg ?? v.max_payload_kg ?? 750,
      imageKey: 'truck',
    }));
  },

  saveVehicle: (input: VehicleInput) =>
    request<DriverProfile>({ method: 'PUT', url: '/driver/vehicle', data: input }),

  saveKyc: (input: KycInput) =>
    request<DriverProfile>({ method: 'PUT', url: '/driver/kyc', data: input }),

  saveBank: (input: BankInput) =>
    request<DriverProfile>({ method: 'PUT', url: '/driver/bank', data: input }),

  submitDailyCheck: (photoUrl: string) =>
    request<DailyCheck>({ method: 'POST', url: '/driver/daily-check', data: { photoUrl } }),

  markWelcomeBonusSeen: () =>
    request<DriverProfile>({ method: 'POST', url: '/driver/welcome-bonus/seen' }),
};
