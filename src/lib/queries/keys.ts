import type { EarningsPeriod } from '@/lib/api/models';

/**
 * Query key factory. Keys include every input that changes the result;
 * user-scoped data is cleared on logout (see use-auth-store).
 */
export const queryKeys = {
  me: ['me'] as const,
  languages: ['config', 'languages'] as const,
  support: ['support'] as const,
  profile: ['driver', 'profile'] as const,
  vehicleTypes: ['driver', 'vehicle-types'] as const,
  offers: ['driver', 'offers'] as const,
  activeJob: ['driver', 'jobs', 'active'] as const,
  job: (id: string) => ['driver', 'jobs', id] as const,
  messages: (jobId: string) => ['driver', 'jobs', jobId, 'messages'] as const,
  demoOtps: (jobId: string) => ['dev', 'jobs', jobId, 'otps'] as const,
  earnings: (period: EarningsPeriod) => ['driver', 'earnings', period] as const,
  wallet: ['driver', 'wallet'] as const,
  trips: ['driver', 'trips'] as const,
};
