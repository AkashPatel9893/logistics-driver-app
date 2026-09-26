/**
 * Simulated dispatch. The real backend matches customer orders to nearby
 * online drivers; here orders are synthesised from the same places and rate
 * card the customer app uses, so offers look and price like real bookings.
 */
import type { GeoPoint, JobOffer, OrderStop } from '@/lib/api/models';
import { distanceKm } from '@/lib/geo';

import { db, type DriverRecord, type OfferRecord } from '../db';
import { randomDigits, randomId, randomInt } from '../http';
import { commissionFor, fareFor, roadDistanceKm, tripMinutes } from '../pricing';
import {
  CUSTOMERS,
  HOUSE_NUMBERS,
  PLACES,
  PREPAID_METHOD_LABELS,
  RIDE_RATES,
  SERVICE_AREA_CENTER,
  VEHICLE_TYPES,
  type SeedPlace,
} from '../seed';
import { emit } from './events';
import { activeJobFor } from './jobs';
import { pendingSteps, saveDriver } from './profile';

/** How long a driver has to accept an offer. */
export const OFFER_TTL_MS = 30_000;
const FIRST_OFFER_DELAY_MS: [number, number] = [5_000, 10_000];
const NEXT_OFFER_DELAY_MS: [number, number] = [10_000, 20_000];
/** Beyond this the driver's GPS is treated as outside the service area. */
const SERVICE_RADIUS_KM = 80;
const MIN_TRIP_KM = 3;
const MAX_TRIP_KM = 35;

function pick<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

export function scheduleNextOffer(driver: DriverRecord, first = false): void {
  const [min, max] = first ? FIRST_OFFER_DELAY_MS : NEXT_OFFER_DELAY_MS;
  driver.nextOfferAt = Date.now() + randomInt(min, max);
  saveDriver(driver);
}

function driverOrigin(driver: DriverRecord): GeoPoint | null {
  const location = driver.lastLocation;
  if (!location) return null;
  return distanceKm(location, SERVICE_AREA_CENTER) <= SERVICE_RADIUS_KM ? location : null;
}

function stopAt(place: SeedPlace, contact: { name: string; phone: string }): OrderStop {
  return {
    label: `${place.name}, ${place.address}`,
    location: place.location,
    houseNumber: pick(HOUSE_NUMBERS),
    contact,
  };
}

function newOtp(exclude?: string): string {
  let otp = randomDigits(4);
  while (otp === exclude) otp = randomDigits(4);
  return otp;
}

function createOffer(driver: DriverRecord, now: number): OfferRecord {
  const vehicleTypeId = driver.vehicle?.vehicleTypeId ?? 'mini-truck';
  const vehicle = VEHICLE_TYPES.find((v) => v.id === vehicleTypeId) ?? VEHICLE_TYPES[2];
  const rate = RIDE_RATES.find((r) => r.vehicleId === vehicle.id) ?? RIDE_RATES[2];
  const origin = driverOrigin(driver);

  // Pickups come from the places closest to the driver, like real dispatch.
  const byDistance = [...PLACES].sort(
    (a, b) =>
      distanceKm(origin ?? SERVICE_AREA_CENTER, a.location) -
      distanceKm(origin ?? SERVICE_AREA_CENTER, b.location),
  );
  const pickupPlace = pick(byDistance.slice(0, 4));
  const drops = PLACES.filter((p) => {
    const km = roadDistanceKm(pickupPlace.location, p.location);
    return p !== pickupPlace && km >= MIN_TRIP_KM && km <= MAX_TRIP_KM;
  });
  const dropPlace = pick(drops.length ? drops : PLACES.filter((p) => p !== pickupPlace));

  const sender = pick(CUSTOMERS);
  const receiver = pick(CUSTOMERS.filter((c) => c !== sender));
  const tripDistanceKm = roadDistanceKm(pickupPlace.location, dropPlace.location);
  const fare = fareFor(rate, tripDistanceKm);
  const commission = commissionFor(fare);
  const isCash = Math.random() < 0.55;
  const pickupOtp = newOtp();

  return {
    id: randomId('ofr'),
    orderId: randomId('ord'),
    orderNumber: `RY${now.toString(36).slice(-5).toUpperCase()}`,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + OFFER_TTL_MS).toISOString(),
    vehicle: { id: vehicle.id, name: vehicle.name, imageKey: vehicle.imageKey },
    pickup: stopAt(pickupPlace, sender),
    drop: stopAt(dropPlace, receiver),
    tripDistanceKm,
    pickupDistanceKm: origin ? roadDistanceKm(origin, pickupPlace.location) : null,
    estimatedMinutes: tripMinutes(tripDistanceKm),
    fare,
    driverEarning: fare - commission,
    paymentMode: isCash ? 'cash' : 'prepaid',
    paymentTiming: isCash && Math.random() < 0.3 ? 'on-pickup' : 'on-delivery',
    driverId: driver.userId,
    status: 'pending',
    sender,
    paymentMethodLabel: isCash ? 'Cash' : pick(PREPAID_METHOD_LABELS),
    commission,
    pickupOtp,
    deliveryOtp: newOtp(pickupOtp),
  };
}

export function toOffer(record: OfferRecord): JobOffer {
  const {
    driverId: _driverId,
    status: _status,
    sender: _sender,
    paymentMethodLabel: _label,
    commission: _commission,
    pickupOtp: _pickupOtp,
    deliveryOtp: _deliveryOtp,
    ...offer
  } = record;
  return offer;
}

export function liveOffersFor(userId: string, now = Date.now()): OfferRecord[] {
  return db.offers
    .all()
    .filter(
      (o) => o.driverId === userId && o.status === 'pending' && Date.parse(o.expiresAt) > now,
    );
}

/** Expires stale offers and sends a new one when the driver is free. */
export function runDispatch(driver: DriverRecord, now = Date.now()): void {
  for (const offer of db.offers.all()) {
    if (offer.driverId !== driver.userId || offer.status !== 'pending') continue;
    if (Date.parse(offer.expiresAt) > now) continue;
    db.offers.set(offer.id, { ...offer, status: 'expired' });
    emit(driver.userId, { type: 'offer.expired', offerId: offer.id });
    scheduleNextOffer(driver);
  }

  const eligible =
    driver.isOnline &&
    pendingSteps(driver).length === 0 &&
    !activeJobFor(driver.userId) &&
    liveOffersFor(driver.userId, now).length === 0;
  if (!eligible) return;
  if (driver.nextOfferAt === null) {
    scheduleNextOffer(driver, true);
    return;
  }
  if (now < driver.nextOfferAt) return;

  const offer = createOffer(driver, now);
  db.offers.set(offer.id, offer);
  driver.nextOfferAt = null;
  saveDriver(driver);
  emit(driver.userId, { type: 'offer.new', offer: toOffer(offer) });
}
