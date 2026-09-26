import type { DriverProfile, SetupStep, VerificationStatus, WelcomeBonus } from '@/lib/api/models';

import { db, type DriverRecord } from '../db';
import { HttpError } from '../http';
import { emit } from './events';
import { balanceOf, record } from './ledger';
import { DAY_MS, dayKey } from './time';

/** Simulated back-office review time for submitted documents. */
export const REVIEW_MS = 12_000;
export const DAILY_CHECK_REWARD = 50;
export const WELCOME_BONUS = { amount: 1000, targetTrips: 15, windowDays: 7 };

export function driverFor(userId: string): DriverRecord {
  const existing = db.drivers.get(userId);
  if (existing) return existing;
  return db.drivers.set(userId, {
    userId,
    joinedAt: new Date().toISOString(),
    isOnline: false,
    onlineSince: null,
    vehicle: null,
    kyc: null,
    bank: null,
    bankAccountNumber: null,
    dailyChecks: {},
    welcomeBonusSeen: false,
    welcomeBonusPaid: false,
    lastLocation: null,
    nextOfferAt: null,
    ratings: [],
  });
}

export function saveDriver(driver: DriverRecord): DriverRecord {
  return db.drivers.set(driver.userId, driver);
}

function settle(status: VerificationStatus, submittedAt: string, now: number): VerificationStatus {
  return status === 'under_review' && now - Date.parse(submittedAt) >= REVIEW_MS
    ? 'verified'
    : status;
}

/** Completes document reviews whose time has come. Returns true when anything changed. */
export function settleVerifications(driver: DriverRecord, now = Date.now()): boolean {
  let changed = false;
  for (const key of ['vehicle', 'kyc', 'bank'] as const) {
    const details = driver[key];
    if (!details) continue;
    const next = settle(details.status, details.submittedAt, now);
    if (next !== details.status) {
      details.status = next;
      changed = true;
    }
  }
  if (changed) saveDriver(driver);
  return changed;
}

export function pendingSteps(driver: DriverRecord): SetupStep[] {
  return (['vehicle', 'kyc', 'bank'] as const).filter(
    (step) => driver[step]?.status !== 'verified',
  );
}

export function deliveredJobs(userId: string) {
  return db.jobs.all().filter((job) => job.driverId === userId && job.status === 'delivered');
}

function welcomeBonusFor(driver: DriverRecord, now: number): WelcomeBonus {
  const expiresAtMs = Date.parse(driver.joinedAt) + WELCOME_BONUS.windowDays * DAY_MS;
  const completedTrips = deliveredJobs(driver.userId).filter(
    (job) => job.deliveredAt && Date.parse(job.deliveredAt) <= expiresAtMs,
  ).length;
  return {
    amount: WELCOME_BONUS.amount,
    targetTrips: WELCOME_BONUS.targetTrips,
    completedTrips: Math.min(completedTrips, WELCOME_BONUS.targetTrips),
    expiresAt: new Date(expiresAtMs).toISOString(),
    status: driver.welcomeBonusPaid ? 'earned' : now > expiresAtMs ? 'expired' : 'active',
    seen: driver.welcomeBonusSeen,
  };
}

/** Pays the welcome bonus once the trip target is hit inside the window. */
export function checkWelcomeBonus(driver: DriverRecord): void {
  const bonus = welcomeBonusFor(driver, Date.now());
  if (bonus.status !== 'active' || bonus.completedTrips < bonus.targetTrips) return;
  driver.welcomeBonusPaid = true;
  saveDriver(driver);
  record(driver.userId, 'bonus', 'Welcome bonus unlocked', bonus.amount);
  emit(driver.userId, { type: 'profile.updated' });
}

export function toProfile(driver: DriverRecord, now = Date.now()): DriverProfile {
  settleVerifications(driver, now);
  const user = db.users.get(driver.userId);
  if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'Account not found.');
  const steps = pendingSteps(driver);
  const todaysPhoto = driver.dailyChecks[dayKey(now)] ?? null;
  const ratings = driver.ratings;
  return {
    id: driver.userId,
    name: user.name,
    phone: user.phone,
    email: user.email,
    city: user.city,
    dob: user.dob,
    joinedAt: driver.joinedAt,
    rating: ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100
      : null,
    ratingCount: ratings.length,
    isOnline: driver.isOnline,
    onlineSince: driver.onlineSince,
    vehicle: driver.vehicle,
    kyc: driver.kyc,
    bank: driver.bank,
    pendingSteps: steps,
    canGoOnline: steps.length === 0,
    dailyCheck: {
      completedToday: todaysPhoto !== null,
      photoUrl: todaysPhoto,
      reward: DAILY_CHECK_REWARD,
    },
    welcomeBonus: welcomeBonusFor(driver, now),
    walletBalance: balanceOf(driver.userId),
    lifetimeTrips: deliveredJobs(driver.userId).length,
  };
}
