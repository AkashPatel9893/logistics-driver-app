import { request } from './client';
import type { FuelType } from './models';
import { submitDocument, type DocumentInput } from './onboarding';

export interface CompanyCreateRequest {
  company_name: string;
  owner_name: string;
  phone: string;
  email: string;
  company_type: string;
  registered_address: string;
  /** Optional: a small fleet may not be GST registered. */
  gstin?: string;
}

/** Any subset of the company fields, for editing one thing at a time. */
export type CompanyUpdateRequest = Partial<CompanyCreateRequest>;

export interface CompanyResponse {
  id: string | null;
  company_name: string | null;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  company_type: string | null;
  registered_address: string | null;
  gstin: string | null;
  is_registered: boolean;
}

export interface AssignDriverRequest {
  is_owner_self?: boolean;
  driver_id?: string;
  name?: string;
  phone?: string;
  dob?: string; // YYYY-MM-DD
  dl_number?: string;
}

export interface FleetVehicleCreateRequest {
  registration_number: string;
  vehicle_type_code: string;
  make: string;
  model: string;
  capacity_kg?: number;
  fuel_type: FuelType;
  assign_driver?: AssignDriverRequest;
}

/** PATCH /fleet/vehicles/{id}: only the fields sent change. */
export interface FleetVehicleUpdateRequest {
  make?: string;
  model?: string;
  fuel_type?: FuelType;
}

export interface FleetVehicleDriver {
  id: string;
  name: string;
  phone: string;
  rating: number | null;
  is_owner_self: boolean;
  assignment_status: string;
  /** "INVITED" until an invited driver first signs in. */
  status?: string | null;
  /** Set while the driver is only invited: the id DELETE /fleet/drivers takes to cancel it. */
  invite_id?: string | null;
}

export interface DocumentState {
  verified: boolean;
  label: string;
  is_expiring_soon: boolean;
}

export interface FleetVehicleDocuments {
  rc: DocumentState;
  insurance: DocumentState;
  pollution: DocumentState;
}

export interface FleetVehicleResponse {
  id: string;
  registration_number: string;
  vehicle_type_code: string;
  vehicle_type_name: string;
  make: string;
  model: string;
  capacity_kg: number;
  fuel_type: string;
  status: string;
  driver: FleetVehicleDriver | null;
  documents: FleetVehicleDocuments;
}

export interface UnassignResponse {
  vehicle_id: string;
  status: 'UNASSIGNED';
}

export interface FleetEarnings {
  currency: string;
  timezone: string;
  total_revenue: number | string;
  this_week: number | string;
  today: number | string;
  balance: number | string;
}

export interface FleetStatsResponse {
  total_vehicles: number;
  active_on_road: number;
  unassigned_vehicles: number;
  earnings: FleetEarnings;
  expiring_documents_count: number;
}

export interface LinkRequestCreate {
  owner_phone: string;
  note?: string;
}

export interface LinkRequestCreated {
  request_id: string;
  status: string;
  owner_phone_masked: string;
}

export interface LinkRequestDriver {
  id: string;
  name: string;
  phone: string;
}

export interface LinkRequestResponse {
  request_id: string;
  status: string;
  note: string | null;
  created_at: string;
  decided_at: string | null;
  driver: LinkRequestDriver;
}

/** One row of GET /fleet/drivers: members, pending invites, and the owner while they drive. */
export interface FleetMemberResponse {
  /** The driver's id, or the invite's while `invite_id` is set. Both work with removeDriver. */
  id: string;
  name: string;
  phone: string;
  assignment_status: 'ACTIVE' | 'PENDING' | 'UNASSIGNED';
  vehicle: { id: string; registration_number: string } | null;
  last_active_at: string | null;
  is_owner_self: boolean;
  status?: 'INVITED' | 'ONBOARDING' | 'PENDING_APPROVAL' | 'ACTIVE' | 'UNASSIGNED';
  invite_id?: string | null;
}

export interface FleetWalletResponse {
  owner_type: string;
  balance: number | string;
  currency: string;
  minimum_balance: number | string;
}

export interface FleetWalletTransactionResponse {
  id: string;
  kind: string;
  title: string;
  amount: number | string;
  balance_after: number | string;
  order_id: string | null;
  created_at: string;
}

export interface FleetPayoutResponse {
  id: string;
  payout_reference: string;
  driver_id: string;
  cadence: string;
  period_start: string;
  period_end: string;
  net_amount: number | string;
  currency: string;
  status: string;
  paid_at: string | null;
  wallet: string;
}

export const fleetApi = {
  /** Creates one of the vehicle's documents, uploads its photo and sends it for verification. */
  submitVehicleDocument: (vehicleId: string, input: DocumentInput) =>
    submitDocument(`/fleet/vehicles/${vehicleId}/documents`, input),

  /** Every current paper of a fleet vehicle (RC, insurance, PUC, fitness, permits). */
  listVehicleDocuments: (vehicleId: string, signal?: AbortSignal) =>
    request<{ document_type: string; verification_status: string; expiry_date: string | null }[]>({
      url: `/fleet/vehicles/${vehicleId}/documents`,
      signal,
    }),

  getCompany: (signal?: AbortSignal) =>
    request<CompanyResponse>({
      url: '/fleet/company',
      signal,
    }),

  registerCompany: (body: CompanyCreateRequest) =>
    request<CompanyResponse>({
      url: '/fleet/company',
      method: 'POST',
      data: body,
    }),

  /** PATCH /fleet/company: change only the fields sent. */
  updateCompany: (body: CompanyUpdateRequest) =>
    request<CompanyResponse>({
      url: '/fleet/company',
      method: 'PATCH',
      data: body,
    }),

  getStats: (signal?: AbortSignal) =>
    request<FleetStatsResponse>({
      url: '/fleet/stats',
      signal,
    }),

  listVehicles: (signal?: AbortSignal) =>
    request<FleetVehicleResponse[]>({
      url: '/fleet/vehicles',
      signal,
    }),

  addVehicle: (body: FleetVehicleCreateRequest) =>
    request<FleetVehicleResponse>({
      url: '/fleet/vehicles',
      method: 'POST',
      data: body,
    }),

  listDrivers: (signal?: AbortSignal) =>
    request<FleetMemberResponse[]>({
      url: '/fleet/drivers',
      signal,
    }),

  assignDriver: (vehicleId: string, body: AssignDriverRequest) =>
    request<FleetVehicleResponse>({
      url: `/fleet/vehicles/${vehicleId}/drivers`,
      method: 'POST',
      data: body,
    }),

  unassignDriver: (vehicleId: string) =>
    request<UnassignResponse>({
      url: `/fleet/vehicles/${vehicleId}/drivers`,
      method: 'DELETE',
    }),

  /**
   * Takes a driver out of the fleet and off its vehicles. Given an invite id, cancels the invite.
   * Unassigning does not do that: a pending invite stays on the vehicle.
   */
  removeDriver: (driverId: string) =>
    request<void>({ url: `/fleet/drivers/${driverId}`, method: 'DELETE' }),

  /** Make, model and fuel type only; refused with VEHICLE_DETAILS_LOCKED once the RC is verified. */
  updateVehicle: (vehicleId: string, body: FleetVehicleUpdateRequest) =>
    request<FleetVehicleResponse>({
      url: `/fleet/vehicles/${vehicleId}`,
      method: 'PATCH',
      data: body,
    }),

  removeVehicle: (vehicleId: string) =>
    request<void>({
      url: `/fleet/vehicles/${vehicleId}`,
      method: 'DELETE',
    }),

  requestLink: (body: LinkRequestCreate) =>
    request<LinkRequestCreated>({
      url: '/fleet/link-requests',
      method: 'POST',
      data: body,
    }),

  listPendingLinkRequests: (signal?: AbortSignal) =>
    request<LinkRequestResponse[]>({
      url: '/fleet/link-requests',
      signal,
    }),

  approveLinkRequest: (requestId: string) =>
    request<LinkRequestResponse>({
      url: `/fleet/link-requests/${requestId}/approve`,
      method: 'POST',
    }),

  rejectLinkRequest: (requestId: string) =>
    request<LinkRequestResponse>({
      url: `/fleet/link-requests/${requestId}/reject`,
      method: 'POST',
    }),

  getWallet: (signal?: AbortSignal) =>
    request<FleetWalletResponse>({
      url: '/fleet/wallet',
      signal,
    }),

  getWalletTransactions: (limit = 50, signal?: AbortSignal) =>
    request<FleetWalletTransactionResponse[]>({
      url: '/fleet/wallet/transactions',
      params: { limit },
      signal,
    }),

  topupWallet: (amount: number, idempotencyKey?: string) =>
    request<FleetWalletResponse>({
      url: '/fleet/wallet/topups',
      method: 'POST',
      data: { amount },
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    }),

  listPayouts: (signal?: AbortSignal) =>
    request<FleetPayoutResponse[]>({
      url: '/fleet/payouts',
      signal,
    }),

  withdraw: (amount: number, idempotencyKey?: string) =>
    request<FleetPayoutResponse>({
      url: '/fleet/payouts',
      method: 'POST',
      data: { amount },
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    }),
};
