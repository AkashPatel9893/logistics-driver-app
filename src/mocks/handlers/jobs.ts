import type { ChatMessage, PaymentQr, VerifyStopInput } from '@/lib/api/models';

import { db, type JobRecord } from '../db';
import { body, created, HttpError, ok, randomId, randomInt, requireUser } from '../http';
import { UPI_PAYEE } from '../seed';
import { liveOffersFor, scheduleNextOffer, toOffer } from '../driver/dispatch';
import {
  activeJobFor,
  greetOnAccept,
  messagesFor,
  ownedJob,
  paymentDueAt,
  replyToDriver,
  requireStatus,
  saveJob,
  toJob,
} from '../driver/jobs';
import { record } from '../driver/ledger';
import { checkWelcomeBonus, driverFor, saveDriver } from '../driver/profile';
import { tick } from '../driver/scheduler';
import type { Route } from './types';

const QR_TTL_MS = 10 * 60_000;
/** How long the simulated customer takes to scan and pay. */
const QR_PAY_DELAY_MS: [number, number] = [12_000, 18_000];

function checkOtp(expected: string, input: VerifyStopInput, who: string): void {
  if (!/^\d{4}$/.test(input.otp ?? '')) {
    throw new HttpError(422, 'INVALID_OTP', 'Enter the 4-digit code.');
  }
  if (input.otp !== expected) {
    throw new HttpError(422, 'INVALID_OTP', `That code doesn't match. Ask the ${who} to check it.`);
  }
  if (!input.photoUrl) {
    throw new HttpError(422, 'PHOTO_REQUIRED', 'Take a photo of the parcel first.');
  }
}

function requirePaymentSettled(job: JobRecord, stop: 'pickup' | 'drop'): void {
  if (paymentDueAt(job, stop)) {
    throw new HttpError(
      409,
      'PAYMENT_PENDING',
      `Collect ₹${job.payment.amount} before completing this stop.`,
    );
  }
}

function settleDelivered(job: JobRecord): void {
  const collectedInCash = job.payment.mode === 'cash' && job.payment.collectedVia === 'cash';
  if (collectedInCash) {
    // Driver keeps the cash; the platform's cut comes out of the wallet.
    record(
      job.driverId,
      'cash_commission',
      `Commission on cash trip ${job.number}`,
      -job.commission,
      job.number,
    );
  } else {
    record(job.driverId, 'trip_earning', `Trip ${job.number}`, job.driverEarning, job.number);
  }
  const driver = driverFor(job.driverId);
  // Stands in for the customer rating the trip in their app.
  driver.ratings = [...driver.ratings, Math.random() < 0.8 ? 5 : 4];
  saveDriver(driver);
  scheduleNextOffer(driver);
  checkWelcomeBonus(driver);
}

export const jobRoutes: Route[] = [
  {
    method: 'GET',
    path: '/driver/offers',
    handler: (req) => {
      const userId = requireUser(req);
      tick(userId);
      return ok(liveOffersFor(userId).map(toOffer));
    },
  },
  {
    method: 'POST',
    path: '/driver/offers/:id/accept',
    handler: (req) => {
      const userId = requireUser(req);
      const offer = db.offers.get(req.params.id);
      if (!offer || offer.driverId !== userId) {
        throw new HttpError(404, 'OFFER_NOT_FOUND', 'This request is no longer available.');
      }
      if (offer.status !== 'pending' || Date.parse(offer.expiresAt) <= Date.now()) {
        throw new HttpError(
          410,
          'OFFER_EXPIRED',
          'This request expired or went to another driver.',
        );
      }
      if (activeJobFor(userId)) {
        throw new HttpError(409, 'ACTIVE_JOB', 'Finish your current trip first.');
      }
      db.offers.set(offer.id, { ...offer, status: 'accepted' });
      const now = new Date().toISOString();
      const job: JobRecord = {
        id: offer.orderId,
        number: offer.orderNumber,
        status: 'heading_to_pickup',
        acceptedAt: now,
        vehicle: offer.vehicle,
        pickup: offer.pickup,
        drop: offer.drop,
        sender: offer.sender,
        route: [offer.pickup.location, offer.drop.location].filter((p) => p !== null),
        tripDistanceKm: offer.tripDistanceKm,
        estimatedMinutes: offer.estimatedMinutes,
        fare: offer.fare,
        driverEarning: offer.driverEarning,
        commission: offer.commission,
        payment: {
          mode: offer.paymentMode,
          timing: offer.paymentTiming,
          amount: offer.fare,
          methodLabel: offer.paymentMethodLabel,
          status: offer.paymentMode === 'prepaid' ? 'collected' : 'pending',
          collectedVia: offer.paymentMode === 'prepaid' ? 'online' : null,
          collectedAt: offer.paymentMode === 'prepaid' ? offer.createdAt : null,
        },
        pickupPhotoUrl: null,
        dropPhotoUrl: null,
        arrivedAtPickupAt: null,
        pickedUpAt: null,
        arrivedAtDropAt: null,
        deliveredAt: null,
        cancelledAt: null,
        cancelReason: null,
        driverId: userId,
        pickupOtp: offer.pickupOtp,
        deliveryOtp: offer.deliveryOtp,
        paymentQr: null,
      };
      saveJob(job, false);
      greetOnAccept(job);
      return ok(toJob(job), 'Trip accepted');
    },
  },
  {
    method: 'POST',
    path: '/driver/offers/:id/reject',
    handler: (req) => {
      const userId = requireUser(req);
      const offer = db.offers.get(req.params.id);
      if (offer && offer.driverId === userId && offer.status === 'pending') {
        db.offers.set(offer.id, { ...offer, status: 'rejected' });
        scheduleNextOffer(driverFor(userId));
      }
      return ok(null, 'Request declined');
    },
  },
  {
    method: 'GET',
    path: '/driver/jobs/active',
    handler: (req) => {
      const userId = requireUser(req);
      tick(userId);
      const job = activeJobFor(userId);
      return ok(job ? toJob(job) : null);
    },
  },
  {
    method: 'GET',
    path: '/driver/jobs/:id',
    handler: (req) => ok(toJob(ownedJob(req))),
  },
  {
    method: 'POST',
    path: '/driver/jobs/:id/arrive-pickup',
    handler: (req) => {
      const job = ownedJob(req);
      requireStatus(job, 'heading_to_pickup');
      job.status = 'arrived_at_pickup';
      job.arrivedAtPickupAt = new Date().toISOString();
      saveJob(job, false);
      return ok(toJob(job), 'Marked as arrived');
    },
  },
  {
    method: 'POST',
    path: '/driver/jobs/:id/verify-pickup',
    handler: (req) => {
      const job = ownedJob(req);
      requireStatus(job, 'arrived_at_pickup');
      const input = body<VerifyStopInput>(req);
      checkOtp(job.pickupOtp, input, 'sender');
      requirePaymentSettled(job, 'pickup');
      job.status = 'pickup_complete';
      job.pickupPhotoUrl = input.photoUrl;
      job.pickedUpAt = new Date().toISOString();
      saveJob(job, false);
      return ok(toJob(job), 'Pickup verified');
    },
  },
  {
    method: 'POST',
    path: '/driver/jobs/:id/arrive-drop',
    handler: (req) => {
      const job = ownedJob(req);
      requireStatus(job, 'pickup_complete');
      job.status = 'arrived_at_drop';
      job.arrivedAtDropAt = new Date().toISOString();
      saveJob(job, false);
      return ok(toJob(job), 'Marked as arrived');
    },
  },
  {
    method: 'POST',
    path: '/driver/jobs/:id/verify-drop',
    handler: (req) => {
      const job = ownedJob(req);
      requireStatus(job, 'arrived_at_drop');
      const input = body<VerifyStopInput>(req);
      checkOtp(job.deliveryOtp, input, 'receiver');
      requirePaymentSettled(job, 'drop');
      job.status = 'delivered';
      job.dropPhotoUrl = input.photoUrl;
      job.deliveredAt = new Date().toISOString();
      job.paymentQr = null;
      saveJob(job, false);
      settleDelivered(job);
      return ok(toJob(job), 'Delivery complete');
    },
  },
  {
    method: 'POST',
    path: '/driver/jobs/:id/cancel',
    handler: (req) => {
      const job = ownedJob(req);
      requireStatus(job, 'heading_to_pickup', 'arrived_at_pickup');
      const reason = body<{ reason: string }>(req).reason?.trim();
      if (!reason) throw new HttpError(422, 'REASON_REQUIRED', 'Choose a reason to cancel.');
      job.status = 'cancelled';
      job.cancelledAt = new Date().toISOString();
      job.cancelReason = reason;
      job.paymentQr = null;
      saveJob(job, false);
      scheduleNextOffer(driverFor(job.driverId));
      return ok(toJob(job), 'Trip cancelled');
    },
  },
  {
    method: 'POST',
    path: '/driver/jobs/:id/payment/qr',
    handler: (req) => {
      const job = ownedJob(req);
      requireStatus(job, 'arrived_at_pickup', 'pickup_complete', 'arrived_at_drop');
      if (job.payment.mode !== 'cash' || job.payment.status === 'collected') {
        throw new HttpError(409, 'NOTHING_TO_COLLECT', 'This order is already paid.');
      }
      const now = Date.now();
      const amount = job.payment.amount.toFixed(2);
      const params = [
        `pa=${UPI_PAYEE.vpa}`,
        `pn=${encodeURIComponent(UPI_PAYEE.name)}`,
        `am=${amount}`,
        'cu=INR',
        `tr=${job.number}`,
        `tn=${encodeURIComponent(`RYNO order ${job.number}`)}`,
      ];
      const qr: PaymentQr = {
        upiUri: `upi://pay?${params.join('&')}`,
        payeeVpa: UPI_PAYEE.vpa,
        payeeName: UPI_PAYEE.name,
        amount: job.payment.amount,
        reference: job.number,
        expiresAt: new Date(now + QR_TTL_MS).toISOString(),
      };
      // Reuse an open QR so the customer's scan stays valid.
      if (!job.paymentQr) {
        job.paymentQr = { ...qr, paidAt: now + randomInt(...QR_PAY_DELAY_MS) };
        saveJob(job, false);
      }
      const { paidAt: _paidAt, ...open } = job.paymentQr;
      return ok(open);
    },
  },
  {
    method: 'POST',
    path: '/driver/jobs/:id/payment/cash',
    handler: (req) => {
      const job = ownedJob(req);
      requireStatus(job, 'arrived_at_pickup', 'pickup_complete', 'arrived_at_drop');
      if (job.payment.mode !== 'cash' || job.payment.status === 'collected') {
        throw new HttpError(409, 'NOTHING_TO_COLLECT', 'This order is already paid.');
      }
      job.payment = {
        ...job.payment,
        status: 'collected',
        collectedVia: 'cash',
        collectedAt: new Date().toISOString(),
      };
      job.paymentQr = null;
      saveJob(job, false);
      return ok(toJob(job), 'Cash collected');
    },
  },
  {
    method: 'GET',
    path: '/driver/jobs/:id/messages',
    handler: (req) => ok(messagesFor(ownedJob(req).id)),
  },
  {
    method: 'POST',
    path: '/driver/jobs/:id/messages',
    handler: (req) => {
      const job = ownedJob(req);
      requireStatus(
        job,
        'heading_to_pickup',
        'arrived_at_pickup',
        'pickup_complete',
        'arrived_at_drop',
      );
      const text = body<{ text: string }>(req).text?.trim();
      if (!text) throw new HttpError(422, 'EMPTY_MESSAGE', 'Type a message.');
      const message: ChatMessage = {
        id: randomId('msg'),
        orderId: job.id,
        sender: 'driver',
        text: text.slice(0, 500),
        createdAt: new Date().toISOString(),
        readAt: null,
      };
      db.messages.set(job.id, [...messagesFor(job.id), message]);
      replyToDriver(job, text);
      return created(message, 'Sent');
    },
  },
  {
    method: 'POST',
    path: '/driver/jobs/:id/messages/read',
    handler: (req) => {
      const job = ownedJob(req);
      const now = new Date().toISOString();
      db.messages.set(
        job.id,
        messagesFor(job.id).map((m) =>
          m.sender === 'customer' && !m.readAt ? { ...m, readAt: now } : m,
        ),
      );
      return ok(null);
    },
  },
];
