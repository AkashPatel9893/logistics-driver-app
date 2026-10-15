/**
 * Domain models exchanged with the RYNO backend.
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// ─── Auth & account ─────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  /** DD/MM/YYYY as entered during onboarding. */
  dob: string | null;
  city: string | null;
  isOnboarded: boolean;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  dob?: string;
  city?: string;
}

export interface LanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
}

export interface OtpChallenge {
  otpLength: number;
  resendInSeconds: number;
  expiresInSeconds: number;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ─── Shared order primitives (same as the customer app) ─────────────────────

/**
 * Order lifecycle. The driver app moves an order forward; the customer app
 * shows the same states.
 */
export type OrderStatus =
  | 'searching'
  | 'heading_to_pickup'
  | 'arrived_at_pickup'
  | 'pickup_complete'
  | 'arrived_at_drop'
  | 'delivered'
  | 'cancelled';

export type PaymentTiming = 'on-pickup' | 'on-delivery';

export interface OrderContact {
  name: string;
  phone: string;
}

export interface OrderStop {
  label: string;
  location: GeoPoint | null;
  houseNumber: string;
  contact: OrderContact | null;
}

export interface VehicleRef {
  id: string;
  name: string;
  imageKey: string;
}

// ─── Driver onboarding ──────────────────────────────────────────────────────

export type VerificationStatus = 'under_review' | 'verified' | 'rejected';

export interface VehicleTypeOption {
  id: string;
  name: string;
  /** Backend vehicle type code, needed to register a vehicle. */
  code: string;
  capacityKg: number;
  imageKey: string;
  /** Picture served by the backend; null shows the app's one fallback image. */
  imageUrl: string | null;
}

export interface VehicleDetails {
  vehicleTypeId: string;
  vehicleTypeName: string;
  model: string;
  plateNumber: string;
  rcPhotoUrl: string;
  frontPhotoUrl: string;
  status: VerificationStatus;
  submittedAt: string;
}

export type FuelType = 'PETROL' | 'DIESEL' | 'CNG' | 'ELECTRIC';

export interface VehicleInput {
  vehicleTypeId: string;
  make: string;
  model: string;
  plateNumber: string;
  fuelType: FuelType;
  /** Local photo URIs and ISO expiry dates; uploaded when the form is submitted. */
  rcPhotoUri: string;
  insurancePhotoUri: string;
  insuranceExpiry: string;
  /** Pollution certificate — not needed for electric vehicles. */
  pucPhotoUri: string | null;
  pucExpiry: string | null;
}

export interface KycDetails {
  /** Masked by the backend, e.g. "••••1234"; empty when not on file. */
  panNumber: string;
  dlNumber: string;
  status: VerificationStatus;
  /** Required documents not yet submitted, e.g. ["Selfie"]. */
  missing: string[];
}

export interface KycInput {
  panNumber: string;
  panPhotoUri: string;
  dlNumber: string;
  /** ISO date (YYYY-MM-DD). */
  dlExpiry: string;
  dlPhotoUri: string;
  selfieUri: string;
}

export interface BankDetails {
  holderName: string;
  /** Never the full number — the server keeps that. */
  accountLast4: string;
  ifscCode: string;
  bankName: string;
  chequePhotoUrl: string;
  status: VerificationStatus;
  submittedAt: string;
}

export interface BankInput {
  holderName: string;
  accountNumber: string;
  ifscCode: string;
}

/** Where the driver's application stands with the backend. */
export interface OnboardingState {
  status: 'in_progress' | 'submitted' | 'approved' | 'rejected';
  /** Every step is complete and the application can be sent for review. */
  canSubmit: boolean;
  rejectionReason: string | null;
  /** Why the driver can't go online yet, in the backend's words. */
  blockers: string[];
}

export type SetupStep = 'vehicle' | 'kyc' | 'bank';

export interface DailyCheck {
  /** True once today's vehicle selfie is in. Resets at local midnight. */
  completedToday: boolean;
  photoUrl: string | null;
  reward: number;
}

export interface WelcomeBonus {
  amount: number;
  targetTrips: number;
  completedTrips: number;
  expiresAt: string;
  status: 'active' | 'earned' | 'expired';
  /** The intro sheet was shown once already. */
  seen: boolean;
}

export interface DriverProfile {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  city: string | null;
  dob: string | null;
  joinedAt: string;
  /** Null until the first customer rating. */
  rating: number | null;
  ratingCount: number;
  isOnline: boolean;
  onlineSince: string | null;
  vehicle: VehicleDetails | null;
  kyc: KycDetails | null;
  bank: BankDetails | null;
  /** Steps still missing or not yet verified; empty when the driver can go online. */
  pendingSteps: SetupStep[];
  canGoOnline: boolean;
  onboarding: OnboardingState;
  dailyCheck: DailyCheck;
  welcomeBonus: WelcomeBonus;
  walletBalance: number;
  lifetimeTrips: number;
}

// ─── Jobs ───────────────────────────────────────────────────────────────────

/** How the customer pays: cash to the driver, or already paid online. */
export type PaymentMode = 'cash' | 'prepaid';

/** A delivery offered to this driver; accept before `expiresAt`. */
export interface JobOffer {
  id: string;
  orderId: string;
  orderNumber: string;
  createdAt: string;
  expiresAt: string;
  vehicle: VehicleRef;
  pickup: OrderStop;
  drop: OrderStop;
  /** Pickup → drop road distance. */
  tripDistanceKm: number;
  /** Driver → pickup, from the driver's last reported location. */
  pickupDistanceKm: number | null;
  estimatedMinutes: number;
  /** What the customer pays. */
  fare: number;
  /** What the driver keeps after platform commission; null until the backend has computed it. */
  driverEarning: number | null;
  paymentMode: PaymentMode;
  paymentTiming: PaymentTiming;
}

export interface JobPayment {
  mode: PaymentMode;
  timing: PaymentTiming;
  amount: number;
  methodLabel: string;
  status: 'pending' | 'collected';
  collectedVia: 'cash' | 'upi' | 'online' | null;
  collectedAt: string | null;
}

/** An order this driver accepted — the driver-side view of the customer's Order. */
export interface DriverJob {
  id: string;
  number: string;
  status: OrderStatus;
  acceptedAt: string;
  vehicle: VehicleRef;
  pickup: OrderStop;
  drop: OrderStop;
  /** Who booked the order. */
  sender: OrderContact;
  route: GeoPoint[];
  tripDistanceKm: number;
  estimatedMinutes: number;
  fare: number;
  /** Null until the backend has computed them — the app never estimates a commission. */
  driverEarning: number | null;
  commission: number | null;
  payment: JobPayment;
  pickupPhotoUrl: string | null;
  dropPhotoUrl: string | null;
  arrivedAtPickupAt: string | null;
  pickedUpAt: string | null;
  arrivedAtDropAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  unreadMessages: number;
}

export interface VerifyStopInput {
  otp: string;
  /** Hosted proof photo, when one was actually uploaded. */
  photoUrl?: string;
}

export interface ChatMessage {
  id: string;
  orderId: string;
  sender: 'driver' | 'customer';
  text: string;
  createdAt: string;
  readAt: string | null;
}

/** A UPI collect QR for one order. `upiUri` is what the QR encodes. */
export interface PaymentQr {
  upiUri: string;
  payeeVpa: string;
  payeeName: string;
  amount: number;
  reference: string;
  expiresAt: string;
}

// ─── Earnings & wallet ──────────────────────────────────────────────────────

export type DriverTransactionKind =
  'trip_earning' | 'cash_commission' | 'incentive' | 'bonus' | 'payout';

export interface DriverTransaction {
  id: string;
  kind: DriverTransactionKind;
  title: string;
  /** Positive = credited to the wallet, negative = debited. */
  amount: number;
  createdAt: string;
  orderNumber: string | null;
}

export interface DriverWallet {
  balance: number;
  minPayout: number;
  bankLabel: string | null;
  transactions: DriverTransaction[];
}

export type EarningsPeriod = 'today' | 'week' | 'month';

export interface EarningsSummary {
  period: EarningsPeriod;
  from: string;
  to: string;
  trips: number;
  /** Trip earnings + incentives + bonuses. */
  totalEarnings: number;
  tripEarnings: number;
  incentives: number;
  cashCollected: number;
  onlineMinutes: number;
  /** Chart bars: the last 7 days for "today"/"week", one per week for "month". */
  buckets: { label: string; amount: number }[];
}

export interface TripSummary {
  id: string;
  number: string;
  status: 'delivered' | 'cancelled';
  pickupLabel: string;
  dropLabel: string;
  vehicle: VehicleRef;
  tripDistanceKm: number;
  fare: number;
  driverEarning: number;
  paymentMode: PaymentMode;
  endedAt: string;
}

// ─── Content ────────────────────────────────────────────────────────────────

export interface SupportInfo {
  phone: string;
  email: string;
  faqs: { id: string; question: string; answer: string }[];
}
