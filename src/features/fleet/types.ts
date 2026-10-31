import type { CompanyResponse, FleetVehicleResponse } from '@/lib/api/fleet';

export interface FleetDriver {
  id: string;
  name: string;
  phone: string;
  dob?: string;
  dlNumber?: string;
  rating?: number;
  isOwnerSelf: boolean;
  aadhaarUploaded?: boolean;
  dlUploaded?: boolean;
  assignmentStatus?: string;
}

export interface DocumentVerificationInfo {
  verified: boolean | null;
  label: string;
  expiryDays?: number;
  isExpiringSoon?: boolean;
}

export interface FleetVehicle {
  id: string;
  vehicleTypeCode: string;
  vehicleTypeName: string;
  make: string;
  model: string;
  plateNumber: string;
  capacityKg: number;
  fuelType?: string;
  status?: string;
  imageUrl?: string | null;
  driver: FleetDriver | null;
  documents: {
    rc: DocumentVerificationInfo;
    insurance: DocumentVerificationInfo;
    pollution: DocumentVerificationInfo;
  };
}

export interface CompanyDetails {
  id?: string | null;
  companyName: string;
  ownerName: string;
  phone: string;
  email: string;
  companyType: string;
  registeredAddress: string;
  gstin?: string | null;
  isRegistered: boolean;
}

export type DashboardRole = 'driver' | 'owner';

export function toFleetVehicle(res: FleetVehicleResponse): FleetVehicle {
  return {
    id: res.id,
    vehicleTypeCode: res.vehicle_type_code,
    vehicleTypeName: res.vehicle_type_name,
    make: res.make,
    model: res.model,
    plateNumber: res.registration_number,
    capacityKg: Number(res.capacity_kg),
    fuelType: res.fuel_type,
    status: res.status,
    driver: res.driver
      ? {
          id: res.driver.id,
          name: res.driver.name,
          phone: res.driver.phone,
          rating: res.driver.rating ?? undefined,
          isOwnerSelf: res.driver.is_owner_self,
          assignmentStatus: res.driver.assignment_status,
        }
      : null,
    documents: {
      rc: {
        verified: res.documents?.rc?.verified ?? null,
        label: res.documents?.rc?.label ?? '—',
        isExpiringSoon: res.documents?.rc?.is_expiring_soon,
      },
      insurance: {
        verified: res.documents?.insurance?.verified ?? null,
        label: res.documents?.insurance?.label ?? '—',
        isExpiringSoon: res.documents?.insurance?.is_expiring_soon,
      },
      pollution: {
        verified: res.documents?.pollution?.verified ?? null,
        label: res.documents?.pollution?.label ?? '—',
        isExpiringSoon: res.documents?.pollution?.is_expiring_soon,
      },
    },
  };
}

export function toCompanyDetails(res: CompanyResponse): CompanyDetails {
  return {
    id: res.id,
    companyName: res.company_name ?? '',
    ownerName: res.owner_name ?? '',
    phone: res.phone ?? '',
    email: res.email ?? '',
    companyType: res.company_type ?? '',
    registeredAddress: res.registered_address ?? '',
    gstin: res.gstin ?? '',
    isRegistered: res.is_registered,
  };
}
