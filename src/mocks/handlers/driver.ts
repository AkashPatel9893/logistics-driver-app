import type {
  BankDetails,
  BankInput,
  KycDetails,
  KycInput,
  VehicleDetails,
  VehicleInput,
} from '@/lib/api/models';
import type { LocationUpdate } from '@/lib/api/driver';

import { db } from '../db';
import { body, HttpError, ok, requireUser } from '../http';
import { VEHICLE_TYPES } from '../seed';
import { scheduleNextOffer } from '../driver/dispatch';
import { activeJobFor } from '../driver/jobs';
import { record } from '../driver/ledger';
import { DAILY_CHECK_REWARD, driverFor, saveDriver, toProfile } from '../driver/profile';
import { tick } from '../driver/scheduler';
import { dayKey } from '../driver/time';
import type { Route } from './types';

const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const DL_PATTERN = /^[A-Z]{2}[-\s]?[0-9]{2}[-\s]?[0-9]{4}[-\s]?[0-9]{7}$/;
// State code, RTO number (Delhi adds a letter, e.g. 1L), optional series, 4 digits.
const PLATE_PATTERN = /^[A-Z]{2}\s?[0-9]{1,2}[A-Z]?\s?[A-Z]{0,3}\s?[0-9]{4}$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_PATTERN = /^[0-9]{9,18}$/;

/** First four letters of an IFSC identify the bank. */
const BANKS: Record<string, string> = {
  HDFC: 'HDFC Bank',
  ICIC: 'ICICI Bank',
  SBIN: 'State Bank of India',
  UTIB: 'Axis Bank',
  KKBK: 'Kotak Mahindra Bank',
  PUNB: 'Punjab National Bank',
  BARB: 'Bank of Baroda',
  YESB: 'Yes Bank',
  IDFB: 'IDFC First Bank',
};

function requirePhoto(url: unknown, label: string): string {
  if (typeof url !== 'string' || !url) {
    throw new HttpError(422, 'PHOTO_REQUIRED', `Add a photo of your ${label}.`);
  }
  return url;
}

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export const driverRoutes: Route[] = [
  {
    method: 'GET',
    path: '/driver/profile',
    handler: (req) => {
      const userId = requireUser(req);
      tick(userId);
      return ok(toProfile(driverFor(userId)));
    },
  },
  {
    method: 'PUT',
    path: '/driver/status',
    handler: (req) => {
      const userId = requireUser(req);
      const { isOnline } = body<{ isOnline: boolean }>(req);
      const driver = driverFor(userId);
      const profile = toProfile(driver);
      if (isOnline && !profile.canGoOnline) {
        throw new HttpError(
          409,
          'SETUP_INCOMPLETE',
          'Finish vehicle, KYC and bank verification to go online.',
        );
      }
      if (!isOnline && activeJobFor(userId)) {
        throw new HttpError(409, 'ACTIVE_JOB', 'Complete your current trip before going offline.');
      }
      if (isOnline === driver.isOnline) return ok(profile);

      const now = new Date().toISOString();
      const sessions = db.onlineSessions.get(userId) ?? [];
      if (isOnline) {
        db.onlineSessions.set(userId, [...sessions, { start: now, end: null }]);
        driver.isOnline = true;
        driver.onlineSince = now;
        scheduleNextOffer(driver, true);
      } else {
        db.onlineSessions.set(
          userId,
          sessions.map((s) => (s.end === null ? { ...s, end: now } : s)),
        );
        driver.isOnline = false;
        driver.onlineSince = null;
        driver.nextOfferAt = null;
        // Withdraw any offer still on screen.
        for (const offer of db.offers.all()) {
          if (offer.driverId === userId && offer.status === 'pending') {
            db.offers.set(offer.id, { ...offer, status: 'expired' });
          }
        }
      }
      saveDriver(driver);
      return ok(toProfile(driver), isOnline ? 'You are online' : 'You are offline');
    },
  },
  {
    method: 'POST',
    path: '/driver/location',
    handler: (req) => {
      const userId = requireUser(req);
      const input = body<LocationUpdate>(req);
      if (typeof input.latitude !== 'number' || typeof input.longitude !== 'number') {
        throw new HttpError(422, 'INVALID_LOCATION', 'Latitude and longitude are required.');
      }
      const driver = driverFor(userId);
      driver.lastLocation = {
        latitude: input.latitude,
        longitude: input.longitude,
        recordedAt: input.recordedAt,
      };
      saveDriver(driver);
      return ok({ receivedAt: new Date().toISOString() });
    },
  },
  {
    method: 'GET',
    path: '/driver/vehicle-types',
    handler: () => ok(VEHICLE_TYPES),
  },
  {
    method: 'PUT',
    path: '/driver/vehicle',
    handler: (req) => {
      const userId = requireUser(req);
      const input = body<VehicleInput>(req);
      const type = VEHICLE_TYPES.find((v) => v.id === input.vehicleTypeId);
      if (!type) throw new HttpError(422, 'INVALID_VEHICLE_TYPE', 'Choose your vehicle type.');
      const plateNumber = normalize(input.plateNumber).replace(/\s+/g, ' ');
      if (!PLATE_PATTERN.test(plateNumber)) {
        throw new HttpError(
          422,
          'INVALID_PLATE',
          'Enter the registration number as on your RC, e.g. DL 1L AB 1234.',
        );
      }
      if (!input.model?.trim()) {
        throw new HttpError(422, 'INVALID_MODEL', 'Enter your vehicle model.');
      }
      const driver = driverFor(userId);
      if (driver.isOnline) {
        throw new HttpError(409, 'ONLINE', 'Go offline before changing your vehicle.');
      }
      const vehicle: VehicleDetails = {
        vehicleTypeId: type.id,
        vehicleTypeName: type.name,
        model: input.model.trim(),
        plateNumber,
        rcPhotoUrl: requirePhoto(input.rcPhotoUrl, 'RC'),
        frontPhotoUrl: requirePhoto(input.frontPhotoUrl, 'vehicle front'),
        status: 'under_review',
        submittedAt: new Date().toISOString(),
      };
      driver.vehicle = vehicle;
      saveDriver(driver);
      return ok(toProfile(driver), 'Vehicle submitted for review');
    },
  },
  {
    method: 'PUT',
    path: '/driver/kyc',
    handler: (req) => {
      const userId = requireUser(req);
      const input = body<KycInput>(req);
      const panNumber = normalize(input.panNumber);
      const dlNumber = normalize(input.dlNumber);
      if (!PAN_PATTERN.test(panNumber)) {
        throw new HttpError(422, 'INVALID_PAN', 'Enter a valid PAN, e.g. ABCDE1234F.');
      }
      if (!DL_PATTERN.test(dlNumber)) {
        throw new HttpError(
          422,
          'INVALID_DL',
          'Enter your 15-character driving licence number, e.g. DL-0420190012345.',
        );
      }
      const kyc: KycDetails = {
        panNumber,
        dlNumber,
        dlPhotoUrl: requirePhoto(input.dlPhotoUrl, 'driving licence'),
        aadhaarPhotoUrl: requirePhoto(input.aadhaarPhotoUrl, 'Aadhaar card'),
        status: 'under_review',
        submittedAt: new Date().toISOString(),
      };
      const driver = driverFor(userId);
      driver.kyc = kyc;
      saveDriver(driver);
      return ok(toProfile(driver), 'KYC submitted for review');
    },
  },
  {
    method: 'PUT',
    path: '/driver/bank',
    handler: (req) => {
      const userId = requireUser(req);
      const input = body<BankInput>(req);
      const holderName = input.holderName?.trim() ?? '';
      const accountNumber = (input.accountNumber ?? '').replace(/\s+/g, '');
      const ifscCode = normalize(input.ifscCode);
      if (holderName.length < 3) {
        throw new HttpError(422, 'INVALID_HOLDER', 'Enter the name as printed on your passbook.');
      }
      if (!ACCOUNT_PATTERN.test(accountNumber)) {
        throw new HttpError(422, 'INVALID_ACCOUNT', 'Enter a valid 9–18 digit account number.');
      }
      if (!IFSC_PATTERN.test(ifscCode)) {
        throw new HttpError(422, 'INVALID_IFSC', 'Enter a valid 11-character IFSC code.');
      }
      const bank: BankDetails = {
        holderName,
        accountLast4: accountNumber.slice(-4),
        ifscCode,
        bankName: BANKS[ifscCode.slice(0, 4)] ?? `${ifscCode.slice(0, 4)} Bank`,
        chequePhotoUrl: requirePhoto(input.chequePhotoUrl, 'cancelled cheque or passbook'),
        status: 'under_review',
        submittedAt: new Date().toISOString(),
      };
      const driver = driverFor(userId);
      driver.bank = bank;
      driver.bankAccountNumber = accountNumber;
      saveDriver(driver);
      return ok(toProfile(driver), 'Bank account submitted for verification');
    },
  },
  {
    method: 'POST',
    path: '/driver/daily-check',
    handler: (req) => {
      const userId = requireUser(req);
      const photoUrl = requirePhoto(body<{ photoUrl: string }>(req).photoUrl, 'vehicle selfie');
      const driver = driverFor(userId);
      const today = dayKey(Date.now());
      if (driver.dailyChecks[today]) {
        throw new HttpError(409, 'ALREADY_DONE', "Today's check is already complete.");
      }
      driver.dailyChecks = { ...driver.dailyChecks, [today]: photoUrl };
      saveDriver(driver);
      record(userId, 'incentive', 'Daily vehicle check', DAILY_CHECK_REWARD);
      return ok(toProfile(driver).dailyCheck, `₹${DAILY_CHECK_REWARD} added to your wallet`);
    },
  },
  {
    method: 'POST',
    path: '/driver/welcome-bonus/seen',
    handler: (req) => {
      const driver = driverFor(requireUser(req));
      driver.welcomeBonusSeen = true;
      saveDriver(driver);
      return ok(toProfile(driver));
    },
  },
];
