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
}

export interface DocumentVerificationInfo {
  verified: boolean;
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
  imageUrl?: string | null;
  driver: FleetDriver;
  documents: {
    rc: DocumentVerificationInfo;
    insurance: DocumentVerificationInfo;
    pollution: DocumentVerificationInfo;
  };
}

export interface CompanyDetails {
  companyName: string;
  ownerName: string;
  phone: string;
  email: string;
  companyType: string;
  registeredAddress: string;
  isRegistered: boolean;
}

export type DashboardRole = 'driver' | 'owner';
