/**
 * Mock-only helpers — NOT part of the real API. In production the sender and
 * receiver read these codes in the customer app; with no backend linking the
 * two apps, the driver app shows them in a "Demo" hint instead.
 */
import { ok } from '../http';
import { ownedJob } from '../driver/jobs';
import type { Route } from './types';

export const devRoutes: Route[] = [
  {
    method: 'GET',
    path: '/dev/jobs/:id/otps',
    handler: (req) => {
      const job = ownedJob(req);
      return ok({ pickupOtp: job.pickupOtp, deliveryOtp: job.deliveryOtp });
    },
  },
];
