import { useLocationStore } from '@/stores/location-store';

import { request } from './client';
import { onboardingApi, type OnboardingStatus } from './onboarding';
import type {
  BankInput,
  DailyCheck,
  DriverProfile,
  GeoPoint,
  BankDetails,
  KycDetails,
  KycInput,
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

/** The driver's registered vehicle from the backend, or null when there is none. */
async function activeVehicle(signal?: AbortSignal): Promise<VehicleDetails | null> {
  try {
    const [vehicles, types] = await Promise.all([
      request<any[]>({ url: '/partner/vehicles', signal }),
      request<any[]>({ url: '/vehicle-types', signal }),
    ]);
    const v = vehicles?.[0];
    if (!v) return null;
    const type = (types ?? []).find((t) => t.code === v.vehicle_type_code);
    return {
      vehicleTypeId: type?.id ?? '',
      vehicleTypeName: type?.display_name ?? v.vehicle_type_code,
      model: [v.make, v.model].filter(Boolean).join(' '),
      plateNumber: v.registration_number,
      rcPhotoUrl: '',
      frontPhotoUrl: '',
      status: 'under_review',
      submittedAt: '',
    };
  } catch {
    return null;
  }
}

/** Whether the backend currently has this driver online (anything but OFFLINE). */
async function isAvailable(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await request<any>({ url: '/partner/availability', signal });
    return Boolean(res?.status) && res.status !== 'OFFLINE';
  } catch {
    // Unknown is shown as offline: never claim the driver is receiving requests.
    return false;
  }
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
function groupStatus(statuses: string[]): VerificationStatus {
  if (statuses.some((s) => ['FAILED', 'REJECTED', 'RESUBMISSION_REQUIRED', 'EXPIRED'].includes(s)))
    return 'rejected';
  return statuses.length > 0 && statuses.every((s) => s === 'VERIFIED')
    ? 'verified'
    : 'under_review';
}

function toOnboardingState(status: OnboardingStatus, blockers: string[]): OnboardingState {
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
  };
}

/** Setup steps the backend's checklist still reports as incomplete. */
function pendingSteps(status: OnboardingStatus): SetupStep[] {
  const done = (step: string) => status.steps[step]?.complete === true;
  const steps: SetupStep[] = [];
  if (!done('VEHICLE') || !done('VEHICLE_DOCUMENTS')) steps.push('vehicle');
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

export const driverApi = {
  getProfile: async (signal?: AbortSignal): Promise<DriverProfile> => {
    {
      try {
        const p = await request<any>({ url: '/partner/profile', signal });
        const vehicle = await activeVehicle(signal);
        const isOnline = await isAvailable(signal);
        // The backend's checklist and eligibility decide what is left and whether the driver may work.
        const [status, eligibility, documents, accounts] = await Promise.all([
          onboardingApi.getStatus(signal),
          onboardingApi.getEligibility(signal),
          onboardingApi.listDocuments(signal),
          onboardingApi.listBankAccounts(signal),
        ]);
        const vehicleDocs = Object.values(status.steps.VEHICLE_DOCUMENTS?.detail ?? {});
        const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Partner Driver';
        return {
          id: p.id,
          name: fullName,
          phone: p.phone_masked ?? null,
          email: p.email ?? '',
          city: p.city ?? null,
          dob: p.date_of_birth ? String(p.date_of_birth) : null,
          joinedAt: p.created_at ?? new Date().toISOString(),
          rating: p.rating ?? null,
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
          dailyCheck: {
            // No daily-check or bonus data from the backend: claim no reward.
            completedToday: true,
            photoUrl: null,
            reward: 0,
          },
          welcomeBonus: {
            status: 'expired',
            seen: true,
            amount: 0,
            targetTrips: 0,
            completedTrips: 0,
            expiresAt: new Date().toISOString(),
          },
          walletBalance: 0,
          lifetimeTrips: p.lifetime_trips ?? 0,
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
          await request<any>({
            method: 'POST',
            url: '/partner/availability/online',
            // MG Road, Bengaluru until the first GPS fix arrives.
            data: {
              latitude: useLocationStore.getState().current?.latitude ?? 12.9716,
              longitude: useLocationStore.getState().current?.longitude ?? 77.5946,
            },
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
      capacityKg: v.capacity_kg ?? v.max_payload_kg ?? 750,
      imageKey: 'truck',
      imageUrl: v.image_url ?? null,
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
        is_owner: true,
      }));
    await onboardingApi.submitVehicleDocument(vehicle.id, {
      type: 'RC',
      identifier: plate,
      fileUri: input.rcPhotoUri,
    });
    await onboardingApi.submitVehicleDocument(vehicle.id, {
      type: 'INSURANCE',
      expiryDate: input.insuranceExpiry,
      fileUri: input.insurancePhotoUri,
    });
    if (input.pucPhotoUri && input.pucExpiry) {
      await onboardingApi.submitVehicleDocument(vehicle.id, {
        type: 'PUC',
        expiryDate: input.pucExpiry,
        fileUri: input.pucPhotoUri,
      });
    }
    return driverApi.getProfile();
  },

  saveKyc: async (input: KycInput): Promise<DriverProfile> => {
    await onboardingApi.submitDriverDocument({
      type: 'DRIVING_LICENCE',
      identifier: input.dlNumber,
      expiryDate: input.dlExpiry,
      fileUri: input.dlPhotoUri,
    });
    await onboardingApi.submitDriverDocument({
      type: 'PAN',
      identifier: input.panNumber,
      fileUri: input.panPhotoUri,
    });
    await onboardingApi.submitDriverDocument({ type: 'SELFIE', fileUri: input.selfieUri });
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

  submitDailyCheck: (photoUrl: string) =>
    request<DailyCheck>({ method: 'POST', url: '/driver/daily-check', data: { photoUrl } }),

  markWelcomeBonusSeen: () =>
    request<DriverProfile>({ method: 'POST', url: '/driver/welcome-bonus/seen' }),
};
