import { request } from './client';

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
  /** Local file URI of the photo. */
  fileUri: string;
}

/** "DD/MM/YYYY" (as typed) → "YYYY-MM-DD", or null when it isn't a real date. */
export function toIsoDate(text: string): string | null {
  const match = /^(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function uploadFile(url: string, fileUri: string) {
  const form = new FormData();
  // React Native's FormData accepts { uri, name, type } file parts.
  form.append('file', { uri: fileUri, name: 'document.jpg', type: 'image/jpeg' } as never);
  return request<any>({
    method: 'POST',
    url,
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/** Creates the document record, uploads its photo, then asks the backend to verify it. */
async function submitDocument(baseUrl: string, input: DocumentInput): Promise<void> {
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
  await request<any>({ method: 'POST', url: `${baseUrl}/${doc.id}/verify` });
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

  listVehicles: () => request<any[]>({ url: '/partner/vehicles' }),

  registerVehicle: (data: {
    vehicle_type_code: string;
    registration_number: string;
    make: string;
    model: string;
    fuel_type: string;
    is_owner: boolean;
  }) => request<any>({ method: 'POST', url: '/partner/vehicles', data }),

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
