import { request } from './client';
import type { SupportInfo } from './models';

/** Server rules the app must follow (GET /config, public). */
export interface AppRules {
  /** Arrival is refused further than this from the stop. */
  arrivalGeofenceMeters: number;
}

export const DEFAULT_APP_RULES: AppRules = { arrivalGeofenceMeters: 200 };

export const contentApi = {
  getRules: async (signal?: AbortSignal): Promise<AppRules> => {
    const res = await request<any>({ url: '/config', signal });
    const meters = Number(res?.arrival_geofence_meters);
    return {
      arrivalGeofenceMeters:
        Number.isFinite(meters) && meters > 0 ? meters : DEFAULT_APP_RULES.arrivalGeofenceMeters,
    };
  },

  getSupport: async (signal?: AbortSignal): Promise<SupportInfo> => {
    const res = await request<any>({ url: '/support', signal });
    return {
      phone: res.phone,
      email: res.email,
      // The backend serves contact channels only; FAQs are optional.
      faqs: Array.isArray(res.faqs) ? res.faqs : [],
    };
  },
};
