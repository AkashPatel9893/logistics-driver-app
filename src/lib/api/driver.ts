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
  getProfile: (signal?: AbortSignal) => request<DriverProfile>({ url: '/driver/profile', signal }),

  setOnline: (isOnline: boolean) =>
    request<DriverProfile>({ method: 'PUT', url: '/driver/status', data: { isOnline } }),

  reportLocation: (update: LocationUpdate) =>
    request<{ receivedAt: string }>({ method: 'POST', url: '/driver/location', data: update }),

  getVehicleTypes: (signal?: AbortSignal) =>
    request<VehicleTypeOption[]>({ url: '/driver/vehicle-types', signal }),

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
