/** Pure rules of driver registration: backend data in, the list of steps out. No requests here. */
import { groupStatus, toOnboardingState } from '@/lib/api/driver';
import type { OnboardingStatus } from '@/lib/api/onboarding';
import type {
  DriverProfile,
  OnboardingState,
  VehicleTypeOption,
  VerificationStatus,
} from '@/lib/api/models';

import { hasDraft } from './drafts';

/** One current driver document as the backend reports it. */
export interface DriverDocument {
  id: string;
  type: string;
  identifierMasked: string | null;
  /** ISO date (YYYY-MM-DD), for documents that expire (e.g. the licence). */
  expiryDate: string | null;
  status: string;
  rejectionReason: string | null;
}

export type StepState = 'todo' | 'selected' | 'review' | 'verified' | 'rejected';

/** Backend document status → what the driver sees on the step. */
export function documentState(status: string | undefined): StepState {
  switch (status) {
    case 'VERIFIED':
      return 'verified';
    case 'PROCESSING':
    case 'MANUAL_REVIEW':
      return 'review';
    case 'FAILED':
    case 'REJECTED':
    case 'RESUBMISSION_REQUIRED':
    case 'EXPIRED':
      return 'rejected';
    // MISSING, or PENDING: created but the upload never finished.
    default:
      return 'todo';
  }
}

export type RegistrationRoute =
  | '/register-vehicle-type'
  | '/register-licence'
  | '/register-photo'
  | '/register-selfie?next=info'
  | '/setup-vehicle'
  | '/owner-permission'
  | '/register-identity'
  | '/setup-bank'
  | '/register-permissions';

export interface RegistrationStep {
  id: string;
  title: string;
  /** Short line under the title: what is on file, or what is needed. */
  detail: string | null;
  state: StepState;
  route: RegistrationRoute;
  optional?: boolean;
  /** Plural subject for "… is under verification" messages. */
  subject: string;
}

/** Shown on a step not sent yet whose photos or details are saved on the phone. */
const DRAFT_DETAIL = 'In progress · tap to continue';

/** Draft keys of each step (see drafts.ts). */
const DRAFT_PREFIXES: Record<string, string[]> = {
  licence: ['licence.'],
  photo: ['profile.'],
  vehicle: ['vehicle.'],
  identity: ['pan.', 'aadhaar.'],
  bank: ['bank.'],
};

function stepHasDraft(id: string) {
  return (DRAFT_PREFIXES[id] ?? []).some(hasDraft);
}

const STATE_DETAIL: Record<StepState, string | null> = {
  todo: null,
  selected: 'Selected',
  review: 'Under verification…',
  verified: 'Verified',
  rejected: 'Needs re-upload',
};

/** What the step list needs; built from the full profile (Home) or the light status (Documents). */
export interface RegistrationSnapshot {
  vehicle: { typeName: string | null; plate: string | null; status: VerificationStatus } | null;
  bank: { label: string; status: VerificationStatus } | null;
  onboarding: OnboardingState;
}

export function snapshotFromProfile(profile: DriverProfile): RegistrationSnapshot {
  return {
    vehicle: profile.vehicle
      ? {
          typeName: profile.vehicle.vehicleTypeName,
          plate: profile.vehicle.plateNumber,
          status: profile.vehicle.status,
        }
      : null,
    bank: profile.bank
      ? {
          label: `${profile.bank.bankName} •• ${profile.bank.accountLast4}`,
          status: profile.bank.status,
        }
      : null,
    onboarding: profile.onboarding,
  };
}

/** From GET /partner/onboarding/status alone: one request instead of the full profile. */
export function snapshotFromStatus(status: OnboardingStatus): RegistrationSnapshot {
  const vehicleDocs = Object.values(status.steps.VEHICLE_DOCUMENTS?.detail ?? {});
  const bankStatus = status.steps.BANK_ACCOUNT?.detail?.status ?? 'MISSING';
  return {
    vehicle: status.steps.VEHICLE?.complete
      ? {
          typeName: null,
          plate: null,
          status: groupStatus(vehicleDocs.length > 0 ? vehicleDocs : ['MISSING']),
        }
      : null,
    bank:
      bankStatus !== 'MISSING'
        ? { label: 'Bank account added', status: groupStatus([bankStatus]) }
        : null,
    onboarding: toOnboardingState(status, []),
  };
}

export function findDocument(docs: DriverDocument[] | undefined, type: string) {
  return docs?.find((d) => d.type === type);
}

/** A vehicle a fleet owner assigned to this driver (the driver does not own or register it). */
export interface FleetAssignedVehicle {
  typeCode: string;
  plate: string;
}

/** The registration steps in the order the driver should do them. */
export function buildRegistrationSteps(
  snapshot: RegistrationSnapshot,
  docs: DriverDocument[] | undefined,
  vehicleTypes: VehicleTypeOption[],
  pickedTypeId: string | null,
  fleetDriver = false,
  fleetVehicle: FleetAssignedVehicle | null = null,
): RegistrationStep[] {
  const pickedType = vehicleTypes.find((t) => t.id === pickedTypeId);
  const typeName = snapshot.vehicle?.typeName ?? pickedType?.name ?? null;

  const docStep = (
    id: string,
    type: string,
    title: string,
    subject: string,
    route: RegistrationRoute,
  ): RegistrationStep => {
    const doc = findDocument(docs, type);
    const state = documentState(doc?.status);
    return {
      id,
      title,
      subject,
      route,
      state,
      detail:
        state === 'rejected' && doc?.rejectionReason
          ? doc.rejectionReason
          : state === 'todo' && stepHasDraft(id)
            ? DRAFT_DETAIL
            : STATE_DETAIL[state],
    };
  };

  const pan = findDocument(docs, 'PAN');
  const aadhaar = findDocument(docs, 'AADHAAR');
  const panState = documentState(pan?.status);
  const aadhaarState = documentState(aadhaar?.status);
  // Both PAN and Aadhaar are asked for: the step is only as far along as the less finished one.
  const idStates = [panState, aadhaarState];
  const idState: StepState = idStates.includes('rejected')
    ? 'rejected'
    : idStates.includes('todo')
      ? 'todo'
      : idStates.every((st) => st === 'verified')
        ? 'verified'
        : 'review';
  const idRejection =
    (panState === 'rejected' ? pan?.rejectionReason : aadhaar?.rejectionReason) ?? null;

  const vehicleState: StepState = snapshot.vehicle
    ? snapshot.vehicle.status === 'verified'
      ? 'verified'
      : snapshot.vehicle.status === 'rejected'
        ? 'rejected'
        : 'review'
    : 'todo';

  const bankState: StepState = snapshot.bank
    ? snapshot.bank.status === 'verified'
      ? 'verified'
      : snapshot.bank.status === 'rejected'
        ? 'rejected'
        : 'review'
    : 'todo';

  // A registered vehicle means its type was chosen, even when this response doesn't name the type
  // (the light status after a fresh login).
  const typeChosen = Boolean(typeName || snapshot.vehicle);

  const steps: RegistrationStep[] = [
    {
      id: 'vehicle-type',
      title: typeName
        ? `Vehicle - ${typeName}`
        : typeChosen
          ? 'Vehicle type'
          : fleetDriver
            ? 'Vehicle - from fleet owner'
            : 'Select your vehicle',
      subject: 'Your vehicle type is',
      detail: typeChosen ? 'Selected' : fleetDriver ? 'Your owner assigns the vehicle' : null,
      state: typeChosen || fleetDriver ? 'selected' : 'todo',
      route: '/register-vehicle-type',
    },
    docStep(
      'licence',
      'DRIVING_LICENCE',
      'Driving Licence',
      'Your driving licence is',
      '/register-licence',
    ),
    // Photo first (selfie screen), then profile information.
    {
      ...docStep(
        'photo',
        'SELFIE',
        'Profile photo',
        'Your profile photo is',
        '/register-selfie?next=info',
      ),
      // Selfie already taken on this phone: open Profile information, not the camera again.
      ...(hasDraft('profile.photo') ? { route: '/register-photo' as const } : {}),
    },
    snapshot.vehicle && snapshot.onboarding.ownerPermissionPending
      ? {
          // Saved, but the owner still has to give permission (NOC and OTP) before review.
          id: 'vehicle',
          title: 'Vehicle number & RC',
          subject: 'Your vehicle documents are',
          detail: [snapshot.vehicle.plate, "Owner's permission needed"].filter(Boolean).join(' · '),
          state: 'todo',
          route: '/owner-permission',
        }
      : {
          id: 'vehicle',
          title: 'Vehicle number & RC',
          subject: 'Your vehicle documents are',
          detail: snapshot.vehicle
            ? [snapshot.vehicle.plate, STATE_DETAIL[vehicleState]].filter(Boolean).join(' · ')
            : stepHasDraft('vehicle')
              ? DRAFT_DETAIL
              : 'Vehicle number, RC, insurance and PUC',
          state: vehicleState,
          route: '/setup-vehicle',
        },
    {
      id: 'identity',
      title: 'PAN & Aadhaar',
      subject: 'Your PAN and Aadhaar are',
      detail:
        idState === 'todo'
          ? panState === 'todo' && aadhaarState === 'todo'
            ? stepHasDraft('identity')
              ? DRAFT_DETAIL
              : 'PAN card and Aadhaar card'
            : panState === 'todo'
              ? 'Aadhaar added · PAN still needed'
              : 'PAN added · Aadhaar still needed'
          : idState === 'rejected' && idRejection
            ? idRejection
            : STATE_DETAIL[idState],
      state: idState,
      route: '/register-identity',
    },
    {
      id: 'bank',
      title: 'Bank account',
      subject: 'Your bank account is',
      detail:
        bankState === 'rejected'
          ? 'Not verified · tap to enter it again'
          : snapshot.bank
            ? snapshot.bank.label
            : stepHasDraft('bank')
              ? DRAFT_DETAIL
              : 'For your trip payouts',
      state: bankState,
      route: '/setup-bank',
    },
  ];

  // A vehicle the fleet owner assigned: the driver has nothing of their own to add.
  if (!fleetVehicle) return steps;
  const assignedType = vehicleTypes.find((t) => t.code === fleetVehicle.typeCode);
  return steps
    .filter((step) => step.id !== 'vehicle')
    .map((step) =>
      step.id === 'vehicle-type'
        ? {
            ...step,
            title: `Vehicle - ${assignedType?.name ?? fleetVehicle.plate}`,
            detail: `Assigned by your fleet owner · ${fleetVehicle.plate}`,
            state: 'selected' as const,
          }
        : step,
    );
}

export function isStepDone(state: StepState) {
  return state === 'selected' || state === 'review' || state === 'verified';
}
