import type { ChatMessage, DriverJob } from '@/lib/api/models';

import { db, type JobRecord } from '../db';
import { HttpError, randomId, randomInt, type MockRequest } from '../http';
import { requireUser } from '../http';
import { emit } from './events';

const ACTIVE = new Set<DriverJob['status']>([
  'heading_to_pickup',
  'arrived_at_pickup',
  'pickup_complete',
  'arrived_at_drop',
]);

export function isActive(job: JobRecord): boolean {
  return ACTIVE.has(job.status);
}

export function activeJobFor(userId: string): JobRecord | null {
  return db.jobs.all().find((job) => job.driverId === userId && isActive(job)) ?? null;
}

export function messagesFor(orderId: string): ChatMessage[] {
  return db.messages.get(orderId) ?? [];
}

export function toJob(record: JobRecord): DriverJob {
  const {
    driverId: _driverId,
    pickupOtp: _pickupOtp,
    deliveryOtp: _deliveryOtp,
    paymentQr: _paymentQr,
    ...job
  } = record;
  const unreadMessages = messagesFor(record.id).filter(
    (m) => m.sender === 'customer' && !m.readAt,
  ).length;
  return { ...job, unreadMessages };
}

/** The request's job, owned by the calling driver. */
export function ownedJob(req: MockRequest): JobRecord {
  const userId = requireUser(req);
  const job = db.jobs.get(req.params.id);
  if (!job || job.driverId !== userId) {
    throw new HttpError(404, 'JOB_NOT_FOUND', 'This trip is no longer available.');
  }
  return job;
}

export function saveJob(job: JobRecord, notify = true): JobRecord {
  db.jobs.set(job.id, job);
  if (notify) emit(job.driverId, { type: 'job.updated', job: toJob(job) });
  return job;
}

export function requireStatus(job: JobRecord, ...allowed: DriverJob['status'][]): void {
  if (job.status === 'cancelled') {
    throw new HttpError(409, 'ORDER_CANCELLED', 'The customer cancelled this order.');
  }
  if (!allowed.includes(job.status)) {
    throw new HttpError(409, 'INVALID_STATE', 'This step is already done. Pull to refresh.');
  }
}

/** True when this stop can't be completed until cash is collected. */
export function paymentDueAt(job: JobRecord, stop: 'pickup' | 'drop'): boolean {
  const timing = stop === 'pickup' ? 'on-pickup' : 'on-delivery';
  return (
    job.payment.mode === 'cash' && job.payment.timing === timing && job.payment.status === 'pending'
  );
}

// ─── Customer simulation ────────────────────────────────────────────────────
// Stands in for the sender typing in the customer app.

function firstName(name: string): string {
  return name.split(' ')[0] ?? name;
}

export function scheduleCustomerMessage(orderId: string, text: string, delayMs: number): void {
  const queue = db.scheduledMessages.get(orderId) ?? [];
  db.scheduledMessages.set(orderId, [...queue, { text, deliverAt: Date.now() + delayMs }]);
}

export function greetOnAccept(job: JobRecord): void {
  const gate = job.pickup.houseNumber ? ` I'm at ${job.pickup.houseNumber}.` : '';
  scheduleCustomerMessage(
    job.id,
    `Hi, this is ${firstName(job.sender.name)}.${gate} Please call when you reach.`,
    randomInt(5_000, 9_000),
  );
}

const REPLIES: { match: RegExp; reply: string }[] = [
  { match: /here|reached|arrived/i, reply: 'Coming down in a minute.' },
  { match: /min|late|traffic|away/i, reply: 'Okay, no problem. I will be ready.' },
  {
    match: /location|where|address|gate/i,
    reply: 'Take the service lane, I am near the main gate.',
  },
];

export function replyToDriver(job: JobRecord, text: string): void {
  if (!isActive(job)) return;
  const reply = REPLIES.find((r) => r.match.test(text))?.reply ?? 'Okay 👍';
  scheduleCustomerMessage(job.id, reply, randomInt(3_000, 6_000));
}

/** Delivers due customer messages. Returns the driver ids that got something. */
export function deliverScheduledMessages(now = Date.now()): void {
  for (const job of db.jobs.all()) {
    const queue = db.scheduledMessages.get(job.id);
    if (!queue?.length) continue;
    const due = queue.filter((m) => m.deliverAt <= now);
    if (!due.length) continue;
    db.scheduledMessages.set(
      job.id,
      queue.filter((m) => m.deliverAt > now),
    );
    if (!isActive(job)) continue;
    const delivered: ChatMessage[] = due.map((m) => ({
      id: randomId('msg'),
      orderId: job.id,
      sender: 'customer',
      text: m.text,
      createdAt: new Date(m.deliverAt).toISOString(),
      readAt: null,
    }));
    db.messages.set(job.id, [...messagesFor(job.id), ...delivered]);
    for (const message of delivered) emit(job.driverId, { type: 'chat.message', message });
    emit(job.driverId, { type: 'job.updated', job: toJob(job) });
  }
}

/** The simulated payment gateway confirms UPI QR payments. */
export function settleQrPayments(now = Date.now()): void {
  for (const job of db.jobs.all()) {
    const qr = job.paymentQr;
    if (!qr || job.payment.status === 'collected' || !isActive(job) || now < qr.paidAt) continue;
    job.payment = {
      ...job.payment,
      status: 'collected',
      collectedVia: 'upi',
      collectedAt: new Date(qr.paidAt).toISOString(),
    };
    job.paymentQr = null;
    saveJob(job);
    emit(job.driverId, {
      type: 'payment.received',
      orderId: job.id,
      amount: job.payment.amount,
      via: 'upi',
    });
  }
}
