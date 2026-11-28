import { Location, LocationProfile } from 'expo-location/next';

import { useLocationStore } from '@/stores/location-store';

import { ApiError, toApiError } from './api-error';
import { eligibilityMessage } from './eligibility-reason';
import { request } from './client';
import { onboardingApi, type OnboardingStatus } from './onboarding';
import type {
  BankInput,
  DocumentAlert,
  DriverProfile,
  Gender,
  FuelType,
  GeoPoint,
  BankDetails,
  KycDetails,
  OnboardingState,
  SetupStep,
  VerificationStatus,
  VehicleDetails,
  VehicleInput,
  VehicleTypeOption,
} from './models';

export interface LocationUpdate extends GeoPoint {
  heading: number | null;
  speedKmph: number | null;
  recordedAt: string;
}

/**
 * The vehicle in use, or null when the driver has none. `activeId` is the profile's active vehicle;
 * the server names one only once it is approved, so until then the newest one stands in.
 */
async function activeVehicle(
  activeId: string | undefined,
  signal?: AbortSignal,
): Promise<VehicleDetails | null> {
  const [vehicles, types] = await Promise.all([
    onboardingApi.listVehicles(signal),
    request<any[]>({ url: '/vehicle-types', signal }),
  ]);
  const v = vehicles.find((item) => item.id === activeId) ?? vehicles[0];
  if (!v) return null;
  const type = (types ?? []).find((t) => t.code === v.vehicle_type_code);
  const fuel = String(v.fuel_type ?? '').toUpperCase();
  return {
    id: v.id,
    vehicleTypeId: type?.id ?? '',
    vehicleTypeName: type?.display_name ?? v.vehicle_type_code,
    model: [v.make, v.model].filter(Boolean).join(' '),
    makeName: v.make ?? '',
    modelName: v.model ?? '',
    fuelType: ['PETROL', 'DIESEL', 'CNG', 'ELECTRIC'].includes(fuel) ? (fuel as FuelType) : null,
    plateNumber: v.registration_number,
    isFleet: v.relationship_type === 'FLEET_DRIVER',
    fleetName: v.fleet?.company_name ?? null,
    rcPhotoUrl: '',
    frontPhotoUrl: '',
    status: 'under_review',
    submittedAt: '',
  };
}

/** Whether the backend currently has this driver online (anything but OFFLINE). */
async function isAvailable(signal?: AbortSignal): Promise<boolean> {
  const res = await request<any>({ url: '/partner/availability', signal });
  if (!res?.status) throw new ApiError('Availability is unavailable. Please try again.', 'unknown');
  return res.status !== 'OFFLINE';
}

const DOCUMENT_NAMES: Record<string, string> = {
  DRIVING_LICENCE: 'Driving licence',
  PAN: 'PAN',
  SELFIE: 'Selfie',
  RC: 'RC',
  INSURANCE: 'Insurance',
  PUC: 'Pollution certificate',
};

/** One status for a group of documents: any problem wins, then anything still pending. */
export function groupStatus(statuses: string[]): VerificationStatus {
  if (statuses.some((s) => ['FAILED', 'REJECTED', 'RESUBMISSION_REQUIRED', 'EXPIRED'].includes(s)))
    return 'rejected';
  return statuses.length > 0 && statuses.every((s) => s === 'VERIFIED')
    ? 'verified'
    : 'under_review';
}

export function toOnboardingState(status: OnboardingStatus, blockers: string[]): OnboardingState {
  const raw = status.onboardingStatus;
  // The backend only reports "can submit" once the agreement is accepted, and
  // the app accepts it as part of submitting — so ignore that one step here.
  const readyApartFromAgreement = Object.entries(status.steps).every(
    ([step, state]) => step === 'AGREEMENT' || state.complete,
  );
  const editable = raw === 'IN_PROGRESS' || raw === 'REJECTED';
  return {
    status:
      raw === 'APPROVED'
        ? 'approved'
        : raw === 'REJECTED'
          ? 'rejected'
          : raw === 'SUBMITTED' || raw === 'UNDER_REVIEW'
            ? 'submitted'
            : 'in_progress',
    canSubmit: status.canSubmit || (editable && readyApartFromAgreement),
    rejectionReason: status.rejectionReason,
    blockers,
    ownerPermissionPending: status.steps.OWNER_AUTHORIZATION?.complete === false,
  };
}

/** Setup steps the backend's checklist still reports as incomplete. */
function pendingSteps(status: OnboardingStatus): SetupStep[] {
  const done = (step: string) => status.steps[step]?.complete === true;
  const steps: SetupStep[] = [];
  if (!done('VEHICLE') || !done('VEHICLE_DOCUMENTS')) steps.push('vehicle');
  else if (status.steps.OWNER_AUTHORIZATION && !done('OWNER_AUTHORIZATION')) steps.push('vehicle');
  if (!done('DRIVER_DOCUMENTS')) steps.push('kyc');
  if (!done('BANK_ACCOUNT')) steps.push('bank');
  return steps;
}

function toKyc(status: OnboardingStatus, documents: any[]): KycDetails | null {
  const detail = status.steps.DRIVER_DOCUMENTS?.detail ?? {};
  const submitted = Object.entries(detail).filter(([, state]) => state !== 'MISSING');
  if (submitted.length === 0) return null;
  const masked = (type: string) =>
    documents.find((d) => d.document_type === type)?.identifier_masked ?? '';
  return {
    panNumber: masked('PAN'),
    dlNumber: masked('DRIVING_LICENCE'),
    status: groupStatus(submitted.map(([, state]) => state)),
    missing: Object.entries(detail)
      .filter(([, state]) => state === 'MISSING')
      .map(([type]) => DOCUMENT_NAMES[type] ?? type),
  };
}

function toBank(accounts: any[]): BankDetails | null {
  const account = accounts.find((a) => a.is_primary) ?? accounts[0];
  if (!account) return null;
  return {
    holderName: account.holder_name,
    accountLast4: account.account_number_last4,
    ifscCode: account.ifsc,
    bankName: account.bank_name ?? 'Bank account',
    chequePhotoUrl: '',
    status: groupStatus([account.verification_status]),
    submittedAt: '',
  };
}

/** `document_alerts` from GET /partner/profile; unknown entries are skipped. */
function toDocumentAlerts(raw: unknown): DocumentAlert[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((a: any) => {
    const documentType = String(a?.document_type ?? a?.type ?? '');
    if (!documentType) return [];
    const daysRaw = a.days_left ?? a.days_until_expiry ?? a.days_remaining;
    const daysLeft = daysRaw == null || !Number.isFinite(Number(daysRaw)) ? null : Number(daysRaw);
    const status = String(a.status ?? a.level ?? '').toUpperCase();
    return [
      {
        documentType,
        message: typeof a.message === 'string' && a.message ? a.message : null,
        expiryDate: a.expiry_date ?? a.expires_on ?? null,
        daysLeft,
        expired: status === 'EXPIRED' || a.expired === true || (daysLeft !== null && daysLeft < 0),
      },
    ];
  });
}

export const driverApi = {
  getProfile: async (signal?: AbortSignal): Promise<DriverProfile> => {
    {
      try {
        const p = await request<any>({ url: '/partner/profile', signal });
        const vehicle = await activeVehicle(p.active_vehicle?.id, signal);
        const isOnline = await isAvailable(signal);
        // The backend's checklist and eligibility decide what is left and whether the driver may work.
        const [status, eligibility, documents, accounts] = await Promise.all([
          onboardingApi.getStatus(signal),
          onboardingApi.getEligibility(signal),
          onboardingApi.listDocuments(signal),
          onboardingApi.listBankAccounts(signal),
        ]);
        const vehicleDocs = Object.values(status.steps.VEHICLE_DOCUMENTS?.detail ?? {});
        const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || '';
        return {
          id: p.id,
          name: fullName,
          phone: p.phone_masked ?? null,
          email: p.email ?? '',
          city: p.city ?? null,
          dob: p.date_of_birth ? String(p.date_of_birth) : null,
          gender: ['MALE', 'FEMALE', 'OTHER'].includes(p.gender) ? p.gender : null,
          lockedFields: Array.isArray(p.locked_fields) ? p.locked_fields : [],
          joinedAt: p.created_at ?? null,
          rating: p.rating != null && Number.isFinite(Number(p.rating)) ? Number(p.rating) : null,
          ratingCount: p.rating_count ?? 0,
          isOnline,
          onlineSince: null,
          vehicle: vehicle
            ? {
                ...vehicle,
                status: groupStatus(vehicleDocs.length > 0 ? vehicleDocs : ['MISSING']),
              }
            : null,
          kyc: toKyc(status, documents ?? []),
          bank: toBank(accounts ?? []),
          pendingSteps: pendingSteps(status),
          canGoOnline: eligibility.allowed,
          onboarding: toOnboardingState(status, eligibility.reasons),
          lifetimeTrips: p.lifetime_trips ?? 0,
          documentAlerts: toDocumentAlerts(p.document_alerts),
        };
      } catch (error) {
        // No invented profile: the screen shows the failure and can retry.
        throw error;
      }
    }
  },

  setOnline: async (isOnline: boolean): Promise<DriverProfile> => {
    {
      try {
        if (isOnline) {
          const permission = await Location.requestForegroundPermissions();
          const granted = permission.status === 'granted';
          useLocationStore.getState().setPermission(granted ? 'granted' : 'denied');
          if (!granted) {
            throw new ApiError('Allow location access to go online.', 'unknown');
          }
          const position = await Location.getPosition({
            maxCachedAge: 120,
            timeout: 10,
            // High accuracy asks for real GPS; balanced priority never wakes the GPS provider.
            profile: LocationProfile.AUTOMOTIVE_NAVIGATION,
          }).catch(() => null);
          // getPosition may return an older cached fix after a timeout.
          if (!position || Date.now() - position.timestamp > 120_000) {
            throw new ApiError('Could not get a recent GPS location. Try again.', 'unknown');
          }
          const { latitude, longitude } = position.coordinates;
          useLocationStore.getState().setCurrent({
            latitude,
            longitude,
            heading: position.heading ?? null,
            speedKmph:
              position.speed != null && position.speed >= 0
                ? Math.round(position.speed * 3.6)
                : null,
          });
          await request<any>({
            method: 'POST',
            url: '/partner/availability/online',
            data: { latitude, longitude },
          }).catch((error) => {
            // The backend lists why; say it in words instead of "Driver is not eligible".
            const apiError = toApiError(error);
            const reasons = apiError.details?.reasons;
            if (apiError.code === 'DRIVER_NOT_ELIGIBLE' && Array.isArray(reasons)) {
              const message = eligibilityMessage(reasons.map(String));
              if (message) throw new ApiError(message, 'http', apiError.status, apiError.code);
            }
            throw error;
          });
        } else {
          await request<any>({
            method: 'POST',
            url: '/partner/availability/offline',
          });
        }
      } catch (error) {
        // The switch must not show "online" when the backend refused it.
        throw error;
      }
      // Re-read the real state: the backend decides whether the driver is online.
      return driverApi.getProfile();
    }
  },

  reportLocation: async (update: LocationUpdate): Promise<{ receivedAt: string }> => {
    await request<any>({
      method: 'POST',
      url: '/tracking/location',
      data: {
        latitude: update.latitude,
        longitude: update.longitude,
        speed_kph: update.speedKmph ?? 0,
        recorded_at: new Date().toISOString(),
      },
    });
    return { receivedAt: new Date().toISOString() };
  },

  getVehicleTypes: async (signal?: AbortSignal): Promise<VehicleTypeOption[]> => {
    const res = await request<any[]>({ url: '/vehicle-types', signal });
    return res.map((v) => ({
      id: v.id,
      code: v.code,
      name: v.display_name ?? v.name,
      capacityKg: v.capacity_kg ?? v.max_payload_kg ?? null,
      imageKey: 'truck',
      imageUrl: v.image_url ?? null,
      requiresPermit: v.requires_commercial_permit === true,
      requiresFitness: v.requires_fitness_certificate === true,
    }));
  },

  /** Registers the vehicle (or reuses the one already on file) and submits its documents. */
  saveVehicle: async (input: VehicleInput): Promise<DriverProfile> => {
    const types = await driverApi.getVehicleTypes();
    const type = types.find((t) => t.id === input.vehicleTypeId);
    if (!type) throw new Error('Choose your vehicle type.');
    const plate = input.plateNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const existing = (await onboardingApi.listVehicles()).find(
      (v) =>
        String(v.registration_number)
          .replace(/[^A-Z0-9]/gi, '')
          .toUpperCase() === plate,
    );
    const vehicle =
      existing ??
      (await onboardingApi.registerVehicle({
        vehicle_type_code: type.code,
        registration_number: plate,
        make: input.make.trim(),
        model: input.model.trim(),
        fuel_type: input.fuelType,
        is_owner: !input.owner,
        ...(input.owner ? { owner: input.owner } : {}),
      }));
    // Only the primary vehicle counts for onboarding, and the backend makes only the first one
    // primary. If the driver corrected the number (e.g. the first RC came back expired), the new
    // vehicle must replace the old one there, or the step keeps showing the old vehicle's status.
    await onboardingApi.setActiveVehicle(vehicle.id);
    // A previous attempt may have saved the vehicle and some documents before failing.
    // Keep already-submitted documents on retry instead of superseding their review records.
    const existingDocs = existing ? await onboardingApi.listVehicleDocuments(vehicle.id) : [];
    const submitted = (type: string) =>
      existingDocs.some(
        (doc) =>
          doc.document_type === type &&
          ['VERIFIED', 'MANUAL_REVIEW'].includes(doc.verification_status),
      );
    if (!submitted('RC'))
      await onboardingApi.submitVehicleDocument(vehicle.id, {
        type: 'RC',
        identifier: plate,
        fileUri: input.rcPhotoUri,
      });
    if (!submitted('INSURANCE'))
      await onboardingApi.submitVehicleDocument(vehicle.id, {
        type: 'INSURANCE',
        expiryDate: input.insuranceExpiry,
        fileUri: input.insurancePhotoUri,
      });
    if (input.pucPhotoUri && input.pucExpiry && !submitted('PUC')) {
      await onboardingApi.submitVehicleDocument(vehicle.id, {
        type: 'PUC',
        expiryDate: input.pucExpiry,
        fileUri: input.pucPhotoUri,
      });
    }
    return driverApi.getProfile();
  },

  /** PATCH changes only what is sent, so gender stays editable after submission (PUT does not). */
  updateGender: async (gender: Gender): Promise<DriverProfile> => {
    await request<any>({ method: 'PATCH', url: '/partner/profile', data: { gender } });
    return driverApi.getProfile();
  },

  saveBank: async (input: BankInput): Promise<DriverProfile> => {
    await onboardingApi.addBankAccount({
      account_number: input.accountNumber,
      ifsc: input.ifscCode,
      holder_name: input.holderName.trim(),
    });
    return driverApi.getProfile();
  },

  /** Sends the completed application for review. */
  submitOnboarding: async (): Promise<DriverProfile> => {
    await onboardingApi.submit();
    return driverApi.getProfile();
  },
};
