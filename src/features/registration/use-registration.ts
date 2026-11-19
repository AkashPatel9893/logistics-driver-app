import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { groupStatus, toOnboardingState } from '@/lib/api/driver';
import { onboardingApi, type DocumentInput, type OnboardingStatus } from '@/lib/api/onboarding';
import type {
  DriverProfile,
  OnboardingState,
  VehicleTypeOption,
  VerificationStatus,
} from '@/lib/api/models';
import { queryKeys } from '@/lib/queries/keys';

/** One current driver document as the backend reports it. */
export interface DriverDocument {
  id: string;
  type: string;
  identifierMasked: string | null;
  status: string;
  rejectionReason: string | null;
}

export function useDriverDocuments() {
  return useQuery({
    queryKey: queryKeys.driverDocuments,
    queryFn: async ({ signal }): Promise<DriverDocument[]> => {
      const docs = await onboardingApi.listDocuments(signal);
      return (docs ?? []).map((d) => ({
        id: d.id,
        type: d.document_type,
        identifierMasked: d.identifier_masked ?? null,
        status: d.verification_status,
        rejectionReason: d.rejection_reason ?? null,
      }));
    },
  });
}

/** Submits one driver document (create, upload front/back, verify), then refreshes the steps. */
export function useSubmitDriverDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DocumentInput) => onboardingApi.submitDriverDocument(input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.driverDocuments });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus });
    },
  });
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

export function useOnboardingStatus() {
  return useQuery({
    queryKey: queryKeys.onboardingStatus,
    queryFn: ({ signal }) => onboardingApi.getStatus(signal),
  });
}

export function findDocument(docs: DriverDocument[] | undefined, type: string) {
  return docs?.find((d) => d.type === type);
}

/** The registration steps in the order the driver should do them. */
export function buildRegistrationSteps(
  snapshot: RegistrationSnapshot,
  docs: DriverDocument[] | undefined,
  vehicleTypes: VehicleTypeOption[],
  pickedTypeId: string | null,
  fleetDriver = false,
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
        state === 'rejected' && doc?.rejectionReason ? doc.rejectionReason : STATE_DETAIL[state],
    };
  };

  const pan = findDocument(docs, 'PAN');
  const aadhaar = findDocument(docs, 'AADHAAR');
  const idState = documentState(pan?.status);
  const aadhaarState = documentState(aadhaar?.status);

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

  return [
    {
      id: 'vehicle-type',
      title: typeName
        ? `Vehicle - ${typeName}`
        : fleetDriver
          ? 'Vehicle - from fleet owner'
          : 'Select your vehicle',
      subject: 'Your vehicle type is',
      detail: typeName ? 'Selected' : fleetDriver ? 'Your owner assigns the vehicle' : null,
      state: typeName || fleetDriver ? 'selected' : 'todo',
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
    docStep(
      'photo',
      'SELFIE',
      'Profile photo',
      'Your profile photo is',
      '/register-selfie?next=info',
    ),
    {
      id: 'vehicle',
      title: 'Vehicle number & RC',
      subject: 'Your vehicle documents are',
      detail: snapshot.vehicle
        ? [snapshot.vehicle.plate, STATE_DETAIL[vehicleState]].filter(Boolean).join(' · ')
        : 'Vehicle number, RC, insurance and PUC',
      state: vehicleState,
      route: '/setup-vehicle',
    },
    {
      id: 'identity',
      title: 'Aadhaar & PAN card',
      subject: 'Your PAN card is',
      detail:
        idState === 'todo'
          ? aadhaarState === 'todo'
            ? null
            : 'Aadhaar added · PAN still needed'
          : idState === 'rejected' && pan?.rejectionReason
            ? pan.rejectionReason
            : STATE_DETAIL[idState],
      state: idState,
      route: '/register-identity',
    },
    {
      id: 'bank',
      title: 'Bank account',
      subject: 'Your bank account is',
      detail: snapshot.bank ? snapshot.bank.label : 'For your trip payouts',
      state: bankState,
      route: '/setup-bank',
    },
  ];
}

export function isStepDone(state: StepState) {
  return state === 'selected' || state === 'review' || state === 'verified';
}
