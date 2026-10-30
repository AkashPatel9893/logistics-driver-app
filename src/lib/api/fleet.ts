import { request } from './client';
import type { FuelType } from './models';

export interface CompanyCreateRequest {
  company_name: string;
  owner_name: string;
  phone: string;
  email: string;
  company_type: string;
  registered_address: string;
  gstin: string;
}

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

export interface FleetVehicleDriver {
  id: string;
  name: string;
  phone: string;
  rating: number | null;
  is_owner_self: boolean;
  assignment_status: string;
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
