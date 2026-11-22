import { ApiError } from './api-error';
import { request } from './client';

export interface RewardOffer {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  /** Where "Know more" goes (partner page or terms), or null for none. */
  linkUrl: string | null;
}

export interface ReferralReward {
  /** What the friend signs up as, e.g. "Bike captain". */
  label: string;
  amount: number;
}

export interface Referral {
  name: string;
  /** e.g. SIGNED_UP, ONBOARDED, REWARDED. */
  status: string;
  rewardAmount: number;
  createdAt: string;
}

export interface ReferralInfo {
  code: string;
  shareMessage: string;
  totalEarned: number;
  rewards: ReferralReward[];
  referrals: Referral[];
}

/** `available: false` while the backend has no such endpoint yet. */
export type Maybe<T> = { available: true; data: T } | { available: false };

function isMissingEndpoint(error: unknown): boolean {
  return error instanceof ApiError && [404, 405, 501].includes(error.status ?? 0);
}

export const growthApi = {
  /** GET /partner/rewards (proposed, not yet built): partner perks such as insurance. */
  getRewards: async (signal?: AbortSignal): Promise<Maybe<RewardOffer[]>> => {
    try {
      const res = await request<any>({ url: '/partner/rewards', signal });
      return {
        available: true,
        data: (res?.items ?? []).map((r: any) => ({
          id: r.id,
          title: r.title,
          subtitle: r.subtitle ?? null,
          description: r.description ?? null,
          linkUrl: r.link_url ?? null,
        })),
      };
    } catch (error) {
      if (isMissingEndpoint(error)) return { available: false };
      throw error;
    }
  },

  /** GET /partner/referral (proposed, not yet built). */
  getReferral: async (signal?: AbortSignal): Promise<Maybe<ReferralInfo>> => {
    try {
      const res = await request<any>({ url: '/partner/referral', signal });
      return {
        available: true,
        data: {
          code: res.code,
          shareMessage: res.share_message ?? '',
          totalEarned: Number(res.total_earned) || 0,
          rewards: (res.rewards ?? []).map((r: any) => ({
            label: r.label,
            amount: Number(r.amount) || 0,
          })),
          referrals: (res.referrals ?? []).map((r: any) => ({
            name: r.name,
            status: r.status,
            rewardAmount: Number(r.reward_amount) || 0,
            createdAt: r.created_at,
          })),
        },
      };
    } catch (error) {
      if (isMissingEndpoint(error)) return { available: false };
      throw error;
    }
  },
};
