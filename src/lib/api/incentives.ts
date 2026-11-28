import { ApiError } from './api-error';
import { request } from './client';

export type IncentiveType = 'DAILY' | 'WEEKLY' | 'BONUS';
export type IncentiveStatus = 'ACTIVE' | 'ACHIEVED' | 'EXPIRED' | 'UPCOMING';
export type IncentiveUnit = 'TRIPS' | 'EARNINGS' | 'ONLINE_MINUTES';

export interface Incentive {
  id: string;
  type: IncentiveType;
  title: string;
  description: string | null;
  /** What the driver is paid on reaching the target. */
  rewardAmount: number;
  status: IncentiveStatus;
  startsAt: string;
  endsAt: string;
  progress: { current: number; target: number; unit: IncentiveUnit };
  conditions: string[];
}

export interface IncentiveClaim {
  id: string;
  title: string;
  amount: number;
  /** PENDING, APPROVED, REJECTED or CREDITED (paid into the wallet). */
  status: string;
  createdAt: string;
}

export interface IncentivesResult {
  /** False while the backend has no driver incentives endpoint. */
  available: boolean;
  programmes: Incentive[];
  claims: IncentiveClaim[];
}

const UNAVAILABLE: IncentivesResult = { available: false, programmes: [], claims: [] };

function mapIncentive(raw: any): Incentive {
  return {
    id: raw.id,
    type: raw.type,
    title: raw.title,
    description: raw.description ?? null,
    rewardAmount: Number(raw.reward_amount) || 0,
    status: raw.status,
    startsAt: raw.starts_at,
    endsAt: raw.ends_at,
    progress: {
      current: Number(raw.progress?.current) || 0,
      target: Number(raw.progress?.target) || 0,
      unit: raw.progress?.unit ?? 'TRIPS',
    },
    conditions: Array.isArray(raw.conditions) ? raw.conditions : [],
  };
}

/** True for the "no such endpoint yet" answers, as opposed to a real failure. */
function isMissingEndpoint(error: unknown): boolean {
  return error instanceof ApiError && [404, 405, 501].includes(error.status ?? 0);
}

export const incentivesApi = {
  /** GET /partner/incentives and its claims; "not available" if the server lacks them. */
  list: async (type: IncentiveType, signal?: AbortSignal): Promise<IncentivesResult> => {
    try {
      const [programmes, claims] = await Promise.all([
        request<any>({ url: '/partner/incentives', params: { type }, signal }),
        request<any>({ url: '/partner/incentives/claims', params: { limit: 20 }, signal }),
      ]);
      return {
        available: true,
        programmes: (programmes?.items ?? []).map(mapIncentive),
        claims: (claims?.items ?? []).map((c: any) => ({
          id: c.id,
          title: c.title,
          amount: Number(c.amount) || 0,
          status: c.status,
          createdAt: c.created_at,
        })),
      };
    } catch (error) {
      if (isMissingEndpoint(error)) return UNAVAILABLE;
      throw error;
    }
  },
};
