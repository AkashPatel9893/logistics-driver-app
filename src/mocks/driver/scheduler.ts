import { runDispatch } from './dispatch';
import { emit } from './events';
import { deliverScheduledMessages, settleQrPayments } from './jobs';
import { driverFor, settleVerifications } from './profile';

/**
 * Advances everything time-based for one driver: document reviews, offer
 * dispatch/expiry, the customer's chat replies and UPI payment confirmations.
 * The real backend does this with workers and webhooks.
 */
export function tick(userId: string, now = Date.now()): void {
  const driver = driverFor(userId);
  if (settleVerifications(driver, now)) emit(userId, { type: 'profile.updated' });
  runDispatch(driver, now);
  deliverScheduledMessages(now);
  settleQrPayments(now);
}
