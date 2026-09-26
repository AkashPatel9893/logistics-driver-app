import type { ChatMessage, DriverJob, JobOffer } from '@/lib/api/models';

/**
 * Messages pushed on the driver's channel `driver:<userId>` (see docs/API.md).
 * Each one either carries the new state or tells the app what to refetch.
 */
export type DriverEvent =
  | { type: 'offer.new'; offer: JobOffer }
  | { type: 'offer.expired'; offerId: string }
  | { type: 'job.updated'; job: DriverJob }
  | { type: 'chat.message'; message: ChatMessage }
  | { type: 'payment.received'; orderId: string; amount: number; via: 'upi' | 'online' }
  | { type: 'profile.updated' };
