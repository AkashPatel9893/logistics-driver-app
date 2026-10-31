import { request } from './client';
import type { SupportInfo } from './models';

export const contentApi = {
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
