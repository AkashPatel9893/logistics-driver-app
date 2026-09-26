import type { EarningsPeriod, EarningsSummary, TripSummary } from '@/lib/api/models';

import { db } from '../db';
import { body, HttpError, ok, requireUser } from '../http';
import { balanceOf, ledgerFor, record } from '../driver/ledger';
import { driverFor } from '../driver/profile';
import { DAY_MS, startOfDay } from '../driver/time';
import type { Route } from './types';

const MIN_PAYOUT = 100;
const PERIODS: EarningsPeriod[] = ['today', 'week', 'month'];
const WEEKDAY = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });
const SHORT_DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

function periodStart(period: EarningsPeriod, now: number): number {
  const today = startOfDay(now);
  if (period === 'today') return today;
  if (period === 'week') return today - 6 * DAY_MS;
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function within(iso: string | null, from: number, to: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return t >= from && t <= to;
}

/** Earned in a window: trip earnings by delivery time plus incentives/bonuses. */
function earnedBetween(userId: string, from: number, to: number): number {
  const trips = db.jobs
    .all()
    .filter((j) => j.driverId === userId && j.status === 'delivered')
    .filter((j) => within(j.deliveredAt, from, to))
    .reduce((sum, j) => sum + j.driverEarning, 0);
  const extras = ledgerFor(userId)
    .filter((t) => (t.kind === 'incentive' || t.kind === 'bonus') && within(t.createdAt, from, to))
    .reduce((sum, t) => sum + t.amount, 0);
  return trips + extras;
}

function onlineMinutesBetween(userId: string, from: number, to: number): number {
  const ms = (db.onlineSessions.get(userId) ?? []).reduce((sum, s) => {
    const start = Math.max(Date.parse(s.start), from);
    const end = Math.min(s.end ? Date.parse(s.end) : to, to);
    return end > start ? sum + (end - start) : sum;
  }, 0);
  return Math.round(ms / 60_000);
}

function buckets(userId: string, period: EarningsPeriod, now: number) {
  if (period === 'month') {
    const from = periodStart('month', now);
    const result: { label: string; amount: number }[] = [];
    for (let start = from; start <= now; start += 7 * DAY_MS) {
      const end = Math.min(start + 7 * DAY_MS - 1, now);
      result.push({
        label: SHORT_DATE.format(start),
        amount: earnedBetween(userId, start, end),
      });
    }
    return result;
  }
  const today = startOfDay(now);
  return Array.from({ length: 7 }, (_, i) => {
    const start = today - (6 - i) * DAY_MS;
    return {
      label: WEEKDAY.format(start),
      amount: earnedBetween(userId, start, start + DAY_MS - 1),
    };
  });
}

export const earningsRoutes: Route[] = [
  {
    method: 'GET',
    path: '/driver/earnings',
    handler: (req) => {
      const userId = requireUser(req);
      const period = (req.query.period ?? 'week') as EarningsPeriod;
      if (!PERIODS.includes(period)) {
        throw new HttpError(422, 'INVALID_PERIOD', 'period must be today, week or month.');
      }
      const now = Date.now();
      const from = periodStart(period, now);
      const delivered = db.jobs
        .all()
        .filter((j) => j.driverId === userId && j.status === 'delivered')
        .filter((j) => within(j.deliveredAt, from, now));
      const incentives = ledgerFor(userId)
        .filter(
          (t) => (t.kind === 'incentive' || t.kind === 'bonus') && within(t.createdAt, from, now),
        )
        .reduce((sum, t) => sum + t.amount, 0);
      const tripEarnings = delivered.reduce((sum, j) => sum + j.driverEarning, 0);
      const summary: EarningsSummary = {
        period,
        from: new Date(from).toISOString(),
        to: new Date(now).toISOString(),
        trips: delivered.length,
        totalEarnings: tripEarnings + incentives,
        tripEarnings,
        incentives,
        cashCollected: delivered
          .filter((j) => j.payment.collectedVia === 'cash')
          .reduce((sum, j) => sum + j.payment.amount, 0),
        onlineMinutes: onlineMinutesBetween(userId, from, now),
        buckets: buckets(userId, period, now),
      };
      return ok(summary);
    },
  },
  {
    method: 'GET',
    path: '/driver/wallet',
    handler: (req) => {
      const userId = requireUser(req);
      const bank = driverFor(userId).bank;
      return ok({
        balance: balanceOf(userId),
        minPayout: MIN_PAYOUT,
        bankLabel: bank ? `${bank.bankName} •• ${bank.accountLast4}` : null,
        transactions: ledgerFor(userId),
      });
    },
  },
  {
    method: 'POST',
    path: '/driver/wallet/payouts',
    handler: (req) => {
      const userId = requireUser(req);
      const amount = Math.round(Number(body<{ amount: number }>(req).amount) * 100) / 100;
      const bank = driverFor(userId).bank;
      if (bank?.status !== 'verified') {
        throw new HttpError(409, 'BANK_NOT_VERIFIED', 'Add and verify a bank account first.');
      }
      if (!Number.isFinite(amount) || amount < MIN_PAYOUT) {
        throw new HttpError(422, 'BELOW_MINIMUM', `Minimum withdrawal is ₹${MIN_PAYOUT}.`);
      }
      if (amount > balanceOf(userId)) {
        throw new HttpError(422, 'INSUFFICIENT_BALANCE', 'Amount is more than your balance.');
      }
      record(userId, 'payout', `Payout to ${bank.bankName} •• ${bank.accountLast4}`, -amount);
      return ok(
        {
          balance: balanceOf(userId),
          minPayout: MIN_PAYOUT,
          bankLabel: `${bank.bankName} •• ${bank.accountLast4}`,
          transactions: ledgerFor(userId),
        },
        'Withdrawal initiated',
      );
    },
  },
  {
    method: 'GET',
    path: '/driver/trips',
    handler: (req) => {
      const userId = requireUser(req);
      const trips: TripSummary[] = db.jobs
        .all()
        .filter((j) => j.driverId === userId)
        .filter((j) => j.status === 'delivered' || j.status === 'cancelled')
        .map((j) => ({
          id: j.id,
          number: j.number,
          status: j.status as TripSummary['status'],
          pickupLabel: j.pickup.label,
          dropLabel: j.drop.label,
          vehicle: j.vehicle,
          tripDistanceKm: j.tripDistanceKm,
          fare: j.fare,
          driverEarning: j.status === 'delivered' ? j.driverEarning : 0,
          paymentMode: j.payment.mode,
          endedAt: (j.deliveredAt ?? j.cancelledAt)!,
        }))
        .sort((a, b) => b.endedAt.localeCompare(a.endedAt));
      return ok(trips);
    },
  },
];
