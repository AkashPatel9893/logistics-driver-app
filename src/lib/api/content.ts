import { request } from './client';
import type { SupportInfo } from './models';

export const contentApi = {
  getSupport: (signal?: AbortSignal) => request<SupportInfo>({ url: '/driver/support', signal }),
};
