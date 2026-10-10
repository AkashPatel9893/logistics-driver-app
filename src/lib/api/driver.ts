import { useLocationStore } from '@/stores/location-store';

import { request } from './client';
import type {
  BankInput,
  DailyCheck,
  DriverProfile,
  GeoPoint,
  KycInput,
  VehicleDetails,
  VehicleInput,
  VehicleTypeOption,
} from './models';

export interface LocationUpdate extends GeoPoint {
  heading: number | null;
  speedKmph: number | null;
  recordedAt: string;
}

/** The driver's registered vehicle from the backend, or null when there is none. */
async function activeVehicle(signal?: AbortSignal): Promise<VehicleDetails | null> {
  try {
    const [vehicles, types] = await Promise.all([
      request<any[]>({ url: '/partner/vehicles', signal }),
      request<any[]>({ url: '/vehicle-types', signal }),
    ]);
    const v = vehicles?.[0];
    if (!v) return null;
    const type = (types ?? []).find((t) => t.code === v.vehicle_type_code);
    return {
      vehicleTypeId: type?.id ?? '',
      vehicleTypeName: type?.display_name ?? v.vehicle_type_code,
      model: [v.make, v.model].filter(Boolean).join(' '),
      plateNumber: v.registration_number,
      rcPhotoUrl: '',
      frontPhotoUrl: '',
      status: v.status === 'ACTIVE' || v.status === 'APPROVED' ? 'verified' : 'under_review',
      submittedAt: '',
    };
  } catch {
    return null;
  }
}

/** Whether the backend currently has this driver online (anything but OFFLINE). */
async function isAvailable(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await request<any>({ url: '/partner/availability', signal });
    return Boolean(res?.status) && res.status !== 'OFFLINE';
  } catch {
    // Unknown is shown as offline: never claim the driver is receiving requests.
    return false;
  }
}

export const driverApi = {
  getProfile: async (signal?: AbortSignal): Promise<DriverProfile> => {
    try {
      return await request<DriverProfile>({ url: '/driver/profile', signal });
    } catch {
      try {
        const p = await request<any>({ url: '/partner/profile', signal });
        const vehicle = await activeVehicle(signal);
        const isOnline = await isAvailable(signal);
        const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Partner Driver';
        return {
          id: p.id,
          name: fullName,
          phone: p.phone_masked ?? null,
          email: p.email ?? '',
          city: p.city ?? null,
          dob: p.date_of_birth ? String(p.date_of_birth) : null,
          joinedAt: p.created_at ?? new Date().toISOString(),
          rating: p.rating ?? null,
          ratingCount: p.rating_count ?? 0,
          isOnline,
          onlineSince: null,
          vehicle,
          kyc: null,
          bank: null,
          pendingSteps: [],
          canGoOnline: true,
          dailyCheck: {
            // No daily-check or bonus data from the backend: claim no reward.
            completedToday: true,
            photoUrl: null,
            reward: 0,
          },
          welcomeBonus: {
            status: 'expired',
            seen: true,
            amount: 0,
            targetTrips: 0,
            completedTrips: 0,
            expiresAt: new Date().toISOString(),
          },
          walletBalance: 0,
          lifetimeTrips: p.lifetime_trips ?? 0,
        };
      } catch (error) {
        // No invented profile: the screen shows the failure and can retry.
        throw error;
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
