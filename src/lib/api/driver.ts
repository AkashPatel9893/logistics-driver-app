import { request } from './client';
import type {
  DailyCheckModel,
  DriverActiveJobModel,
  DriverBankModel,
  DriverChatMessageModel,
  DriverJobRequestModel,
  DriverKycModel,
  DriverPastTripModel,
  DriverProfileModel,
  DriverVehicleModel,
} from './models';

export const driverApi = {
  getProfile: (): Promise<DriverProfileModel> =>
    request<DriverProfileModel>({
      method: 'GET',
      url: '/driver/profile',
    }),

  updateStatus: (isOnline: boolean): Promise<{ isOnline: boolean }> =>
    request<{ isOnline: boolean }>({
      method: 'PATCH',
      url: '/driver/status',
      data: { isOnline },
    }),

  getAvailableJobs: (): Promise<DriverJobRequestModel[]> =>
    request<DriverJobRequestModel[]>({
      method: 'GET',
      url: '/driver/requests',
    }),

  acceptJob: (jobId: string): Promise<DriverActiveJobModel> =>
    request<DriverActiveJobModel>({
      method: 'POST',
      url: `/driver/jobs/${jobId}/accept`,
    }),

  declineJob: (jobId: string): Promise<{ success: boolean }> =>
    request<{ success: boolean }>({
      method: 'POST',
      url: `/driver/jobs/${jobId}/decline`,
    }),

  updateJobStatus: (
    jobId: string,
    status: DriverActiveJobModel['status'],
  ): Promise<DriverActiveJobModel> =>
    request<DriverActiveJobModel>({
      method: 'PATCH',
      url: `/driver/jobs/${jobId}/status`,
      data: { status },
    }),

  verifyPickup: (
    jobId: string,
    otp: string,
    photoUri?: string | null,
  ): Promise<DriverActiveJobModel> =>
    request<DriverActiveJobModel>({
      method: 'POST',
      url: `/driver/jobs/${jobId}/verify-pickup`,
      data: { otp, photoUri },
    }),

  verifyDrop: (
    jobId: string,
    otp: string,
    photoUri?: string | null,
  ): Promise<DriverActiveJobModel> =>
    request<DriverActiveJobModel>({
      method: 'POST',
      url: `/driver/jobs/${jobId}/verify-drop`,
      data: { otp, photoUri },
    }),

  collectPayment: (
    jobId: string,
    amount: number,
    mode: 'Cash' | 'QR',
  ): Promise<{ collected: boolean; newBalance: number }> =>
    request<{ collected: boolean; newBalance: number }>({
      method: 'POST',
      url: `/driver/jobs/${jobId}/collect-payment`,
      data: { amount, mode },
    }),

  sendChatMessage: (jobId: string, text: string): Promise<DriverChatMessageModel> =>
    request<DriverChatMessageModel>({
      method: 'POST',
      url: `/driver/jobs/${jobId}/chat`,
      data: { text },
    }),

  saveVehicle: (vehicle: Partial<DriverVehicleModel>): Promise<DriverVehicleModel> =>
    request<DriverVehicleModel>({
      method: 'POST',
      url: '/driver/vehicle',
      data: vehicle,
    }),

  saveKyc: (kyc: Partial<DriverKycModel>): Promise<DriverKycModel> =>
    request<DriverKycModel>({
      method: 'POST',
      url: '/driver/kyc',
      data: kyc,
    }),

  saveBank: (bank: Partial<DriverBankModel>): Promise<DriverBankModel> =>
    request<DriverBankModel>({
      method: 'POST',
      url: '/driver/bank',
      data: bank,
    }),

  submitDailyCheck: (photoUri: string): Promise<DailyCheckModel> =>
    request<DailyCheckModel>({
      method: 'POST',
      url: '/driver/daily-check',
      data: { photoUri },
    }),

  getPastTrips: (): Promise<DriverPastTripModel[]> =>
    request<DriverPastTripModel[]>({
      method: 'GET',
      url: '/driver/trips',
    }),

  withdrawWallet: (amount: number): Promise<{ newBalance: number; txId: string }> =>
    request<{ newBalance: number; txId: string }>({
      method: 'POST',
      url: '/driver/wallet/withdraw',
      data: { amount },
    }),

  claimBonus: (): Promise<{ newBalance: number; bonus: number }> =>
    request<{ newBalance: number; bonus: number }>({
      method: 'POST',
      url: '/driver/bonus/claim',
    }),
};
