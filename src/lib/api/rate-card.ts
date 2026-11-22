import { ApiError } from './api-error';
import { request } from './client';

export interface RateCard {
  vehicleType: string;
  baseFare: number;
  /** Per-km rate by distance band; `toKm` is null for the last, open-ended band. */
  distanceSlabs: { fromKm: number; toKm: number | null; perKm: number }[];
  perMinute: number;
  waiting: { freeMinutes: number; perMinute: number; maxCharge: number | null } | null;
  cancellation: { min: number; max: number } | null;
  night: { start: string; end: string; percent: number } | null;
  commissionPercent: number | null;
  gstPercent: number | null;
  handlingFee: number | null;
}

export type RateCardResult = { available: true; cards: RateCard[] } | { available: false };

const num = (value: unknown): number => Number(value) || 0;
const optNum = (value: unknown): number | null =>
  value == null || value === '' ? null : Number(value);

function mapCard(raw: any): RateCard {
  return {
    vehicleType: raw.vehicle_type,
    baseFare: num(raw.base_fare),
    distanceSlabs: (raw.distance_slabs ?? []).map((s: any) => ({
      fromKm: num(s.from_km),
      toKm: optNum(s.to_km),
      perKm: num(s.per_km),
    })),
    perMinute: num(raw.per_minute),
    waiting: raw.waiting
      ? {
          freeMinutes: num(raw.waiting.free_minutes),
          perMinute: num(raw.waiting.per_minute),
          maxCharge: optNum(raw.waiting.max_charge),
        }
      : null,
    cancellation: raw.cancellation
      ? { min: num(raw.cancellation.min), max: num(raw.cancellation.max) }
      : null,
    night: raw.night
      ? { start: raw.night.start, end: raw.night.end, percent: num(raw.night.percent) }
      : null,
    commissionPercent: optNum(raw.commission_percent),
    gstPercent: optNum(raw.gst_percent),
    handlingFee: optNum(raw.handling_fee),
  };
}

export const rateCardApi = {
  /** GET /partner/rate-card (proposed, not yet built). */
  get: async (signal?: AbortSignal): Promise<RateCardResult> => {
    try {
      const res = await request<any>({ url: '/partner/rate-card', signal });
      return { available: true, cards: (res?.items ?? []).map(mapCard) };
    } catch (error) {
      if (error instanceof ApiError && [404, 405, 501].includes(error.status ?? 0)) {
        return { available: false };
      }
      throw error;
    }
  },
};
