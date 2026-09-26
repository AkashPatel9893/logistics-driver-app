import { ok } from '../http';
import { SUPPORT_INFO } from '../seed';
import type { Route } from './types';

export const contentRoutes: Route[] = [
  {
    method: 'GET',
    path: '/driver/support',
    handler: () => ok(SUPPORT_INFO),
  },
];
