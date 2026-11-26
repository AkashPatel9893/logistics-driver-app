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
  /**
   * Backend onboarding status (IN_PROGRESS, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED), from
   * login, /auth/me and profile saves. Decides the first screen without loading the profile.
   * Null when not known yet (e.g. a session saved by an older app version).
   */
  onboardingStatus?: string | null;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  dob?: string;
  city?: string;
  /** Operating market picked on Select City; used when the profile is first created. */
  marketCode?: string;
  /** MALE / FEMALE / OTHER. The backend clears it on a save without it, so always send it. */
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
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
  /** Partner role the backend has on record, e.g. FLEET_OWNER; null when none. */
  selectedRole?: string | null;
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
  | 'awaiting_payment'
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
  capacityKg: number | null;
  imageKey: string;
  /** Picture served by the backend; null shows the app's one fallback image. */
  imageUrl: string | null;
}

export interface VehicleDetails {
  /** Backend id, used to read this vehicle's documents. */
  id: string;
  vehicleTypeId: string;
  vehicleTypeName: string;
  /** Make and model together, for display. */
  model: string;
  /** The two parts as entered, to fill the form again. */
  makeName: string;
  modelName: string;
  fuelType: FuelType | null;
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

export interface WelcomeBonus {
  amount: number;
  targetTrips: number;
  completedTrips: number;
  expiresAt: string;
  status: 'active' | 'earned' | 'expired';
  /** The intro sheet was shown once already. */
  seen: boolean;
}

export interface DocumentAlert {
  documentType: string;
  /** Message from the backend when it sends one. */
  message: string | null;
  expiryDate: string | null;
  daysLeft: number | null;
  expired: boolean;
}

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface DriverProfile {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  city: string | null;
  dob: string | null;
  gender: Gender | null;
  /** Backend field names the partner can no longer change (after submission). */
  lockedFields: string[];
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
  welcomeBonus: WelcomeBonus;
  walletBalance: number;
  lifetimeTrips: number;
  /** Documents expiring soon or expired (reminders 15 and 4 days before; expired = offline). */
  documentAlerts: DocumentAlert[];
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
  /** Delivery stops before the final drop (0 for a single-drop order). */
  extraStops: number;
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
  /** Priority booking: the customer paid extra to be served first. */
  isPriority: boolean;
  /** Tip the customer has added so far (can grow while the offer is open); 0 when none. */
  tipAmount: number;
}

/** What the final amount is made of; sent once, when the final drop's code is verified. */
export interface CollectionBreakdown {
  fare: number;
  waitingCharge: number;
  otherCharges: number;
  discount: number;
  tax: number;
  /** Customer tip included in the total (0 when none). */
  tip: number;
  total: number;
  /** Every final component in order (night charge, surge, tip, ...); empty without a quote. */
  lines: { type: string; description: string; amount: number }[];
}

export interface JobPayment {
  /** Present after verify-code on the final drop; absent on a fresh app start (the backend sends it once). */
  breakdown?: CollectionBreakdown;
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
  acceptedAt: string | null;
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
  /** Tips the customer added; already part of the amount to collect. */
  tipTotal: number;
  stops?: JobStop[];
  currentStopId?: string | null;
}

export interface JobStop {
  stopId: string;
  sequenceNumber: number;
  stopType: 'PICKUP' | 'DROP';
  status: 'PENDING' | 'ARRIVED' | 'COMPLETED' | 'FAILED';
  label: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  landmark?: string | null;
  location: GeoPoint | null;
  contact: OrderContact | null;
  arrivedAt?: string | null;
  /** When free waiting ends at this stop (from the order's plan). */
  freeWaitingUntil?: string | null;
  /** Charge per minute once free waiting is over, in rupees. */
  waitingRatePerMinute?: number | null;
  completedAt?: string | null;
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
  createdAt: string | null;
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

export type DriverTransactionKind = string;

export interface DriverTransaction {
  id: string;
  kind: DriverTransactionKind;
  title: string;
  /** Positive = credited to the wallet, negative = debited. */
  amount: number;
  createdAt: string;
  orderNumber: string | null;
  orderId: string | null;
}

export interface DriverWallet {
  balance: number;
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
  paidToFleet: number;
  /** Part of the total from priority bookings, and from customer tips (no commission on tips). */
  priorityEarnings: number;
  tipEarnings: number;
  onlineMinutes: number | null;
  /** Chart bars: the last 7 days for "today"/"week", one per week for "month". */
  buckets: { label: string; amount: number }[];
}

export interface TripSummary {
  id: string;
  orderId: string;
  number: string;
  status: string;
  driverEarning: number;
  /** Earning before commission, and the commission taken from it. */
  grossEarning: number;
  commissionRate: number;
  commission: number;
  /** Extra for a priority booking, and the customer's tip (100% to the driver). */
  priorityEarning: number;
  tipEarning: number;
  endedAt: string;
  paidTo: 'DRIVER' | 'FLEET';
  fleetName: string | null;
  /** From the job record; null when it could not be loaded. */
  orderNumber: string | null;
  pickupLabel: string | null;
  dropLabel: string | null;
  distanceKm: number | null;
}

// ─── Content ────────────────────────────────────────────────────────────────

export interface SupportInfo {
  phone: string;
  email: string;
  faqs: { id: string; question: string; answer: string }[];
}
