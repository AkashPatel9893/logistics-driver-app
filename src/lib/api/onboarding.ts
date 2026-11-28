import { ApiError } from './api-error';
import { request, uploadMultipart } from './client';
import { filePart } from './file-part';
import type { VehicleOwnerInput } from './models';
import { rejectionMessage } from './rejection-reason';

/** Must equal the backend's current partner agreement version. */
const AGREEMENT_VERSION = '2026-01';

export type DocumentStatus =
  | 'MISSING'
  | 'PENDING'
  | 'PROCESSING'
  | 'VERIFIED'
  | 'FAILED'
  | 'MANUAL_REVIEW'
  | 'REJECTED'
  | 'RESUBMISSION_REQUIRED'
  | 'EXPIRED';

export interface OnboardingStatus {
  onboardingStatus: string;
  canSubmit: boolean;
  rejectionReason: string | null;
  /** Checklist step → whether it is complete, plus per-document statuses. */
  steps: Record<string, { complete: boolean; detail: Record<string, string> }>;
}

export interface DocumentInput {
  type: string;
  identifier?: string;
  /** ISO date (YYYY-MM-DD). */
  expiryDate?: string;
  /** Local file URI of the photo (front side). */
  fileUri: string;
  /** Local file URI of the back side, for two-sided cards (licence, Aadhaar, RC). */
  backFileUri?: string | null;
}

/** Formats digits as DD/MM/YYYY while they are typed. */
export function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/');
}

/** "DD/MM/YYYY" (as typed) → "YYYY-MM-DD", or null when it isn't a real date. */
export function toIsoDate(text: string): string | null {
  const match = /^(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso ? null : iso;
}

function uploadFile(url: string, fileUri: string, side: 'front' | 'back' = 'front') {
  return uploadMultipart<any>({
    url,
    fileUri,
    mimeType: filePart(fileUri, 'document').type,
    params: { side },
  });
}

/** Creates the document record, uploads its photo, then asks the backend to verify it. */
export async function submitDocument(baseUrl: string, input: DocumentInput): Promise<void> {
  const doc = await request<any>({
    method: 'POST',
    url: baseUrl,
    data: {
      document_type: input.type,
      ...(input.identifier ? { identifier: input.identifier } : {}),
      ...(input.expiryDate ? { expiry_date: input.expiryDate } : {}),
    },
  });
  await uploadFile(`${baseUrl}/${doc.id}/files`, input.fileUri);
  if (input.backFileUri) await uploadFile(`${baseUrl}/${doc.id}/files`, input.backFileUri, 'back');
  const result = await request<any>({ method: 'POST', url: `${baseUrl}/${doc.id}/verify` });
  if (['FAILED', 'REJECTED', 'RESUBMISSION_REQUIRED'].includes(result.verification_status)) {
    // An ApiError, so the screen shows this text instead of the general fallback.
    throw new ApiError(
      rejectionMessage(result.rejection_reason) ??
        'This document could not be verified. Check the photo and details, then try again.',
      'unknown',
    );
  }
}

/** One row of GET /partner/vehicles. */
export interface PartnerVehicle {
  id: string;
  registration_number: string;
  vehicle_type_code: string;
  make: string | null;
  model: string | null;
  fuel_type: string | null;
  /** "OWNER_DRIVER", "AUTHORIZED_DRIVER" or "FLEET_DRIVER". */
  relationship_type: string;
  /** "PENDING" until an admin approves the assignment, then "ACTIVE". */
  assignment_status: string;
  fleet?: { company_name: string } | null;
  /** Only when someone else owns the vehicle: their NOC and OTP consent. */
  owner_authorization?: OwnerAuthorization | null;
}

/** The owner's permission for a driver who does not own the vehicle: a NOC and the owner's OTP. */
export interface OwnerAuthorization {
  id: string;
  /** "PENDING" until both parts are done, then "ACTIVE"; "REJECTED", "REVOKED" or "EXPIRED" end it. */
  status: string;
  noc_uploaded: boolean;
  owner_otp_verified: boolean;
  owner_phone_masked: string;
  valid_until: string | null;
}

export const onboardingApi = {
  getStatus: async (signal?: AbortSignal): Promise<OnboardingStatus> => {
    const res = await request<any>({ url: '/partner/onboarding/status', signal });
    const steps: OnboardingStatus['steps'] = {};
    for (const item of res.checklist ?? []) {
      steps[item.step] = { complete: Boolean(item.complete), detail: item.detail ?? {} };
    }
    return {
      onboardingStatus: res.onboarding_status,
      canSubmit: Boolean(res.can_submit),
      rejectionReason: res.rejection_reason ?? null,
      steps,
    };
  },

  getEligibility: async (
    signal?: AbortSignal,
  ): Promise<{ allowed: boolean; reasons: string[] }> => {
    const res = await request<any>({ url: '/partner/eligibility', signal });
    return { allowed: Boolean(res.online_allowed), reasons: res.reasons ?? [] };
  },

  listDocuments: (signal?: AbortSignal) => request<any[]>({ url: '/partner/documents', signal }),

  listBankAccounts: (signal?: AbortSignal) =>
    request<any[]>({ url: '/partner/bank-accounts', signal }),

  submitDriverDocument: (input: DocumentInput) => submitDocument('/partner/documents', input),

  submitVehicleDocument: (vehicleId: string, input: DocumentInput) =>
    submitDocument(`/partner/vehicles/${vehicleId}/documents`, input),

  /** The vehicles the driver has now. The server also returns ended assignments (history). */
  listVehicles: async (signal?: AbortSignal) => {
    const list = await request<PartnerVehicle[]>({ url: '/partner/vehicles', signal });
    return (list ?? []).filter((v) => ['PENDING', 'ACTIVE'].includes(v.assignment_status));
  },

  /** Makes this the driver's primary vehicle: the one onboarding checks and driver mode uses. */
  setActiveVehicle: (vehicleId: string) =>
    request<any>({
      method: 'POST',
      url: '/partner/active-vehicle',
      data: { vehicle_id: vehicleId },
    }),

  listVehicleDocuments: (vehicleId: string) =>
    request<any[]>({ url: `/partner/vehicles/${vehicleId}/documents` }),

  registerVehicle: (data: {
    vehicle_type_code: string;
    registration_number: string;
    make: string;
    model: string;
    fuel_type: string;
    is_owner: boolean;
    owner?: VehicleOwnerInput;
  }) => request<any>({ method: 'POST', url: '/partner/vehicles', data }),

  /** The owner's signed NOC letter (a photo). */
  uploadOwnerNoc: (vehicleId: string, fileUri: string) =>
    uploadMultipart<OwnerAuthorization>({
      url: `/partner/vehicles/${vehicleId}/owner-authorization/noc`,
      fileUri,
      mimeType: filePart(fileUri, 'noc').type,
    }),

  /** Texts a code to the owner's phone. */
  requestOwnerOtp: (vehicleId: string) =>
    request<{ owner_phone_masked: string; expires_in_seconds: number }>({
      method: 'POST',
      url: `/partner/vehicles/${vehicleId}/owner-authorization/otp/request`,
    }),

  verifyOwnerOtp: (vehicleId: string, code: string) =>
    request<OwnerAuthorization>({
      method: 'POST',
      url: `/partner/vehicles/${vehicleId}/owner-authorization/otp/verify`,
      data: { code },
    }),

  addBankAccount: (data: { account_number: string; ifsc: string; holder_name: string }) =>
    request<any>({ method: 'POST', url: '/partner/bank-accounts', data }),

  /** Accepts the partner agreement, then sends the application for review. */
  submit: async (): Promise<void> => {
    await request<null>({
      method: 'POST',
      url: '/partner/onboarding/agreement',
      data: { version: AGREEMENT_VERSION },
    });
    await request<any>({ method: 'POST', url: '/partner/onboarding/submit' });
  },
};
