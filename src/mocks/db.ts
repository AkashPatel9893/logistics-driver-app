/**
 * Mock backend "database": JSON tables persisted to MMKV so data survives app
 * restarts, like a real server would keep it. Namespaced away from app data.
 */
import type {
  AuthSession,
  BankDetails,
  ChatMessage,
  DriverJob,
  DriverTransaction,
  GeoPoint,
  JobOffer,
  KycDetails,
  PaymentQr,
  User,
  VehicleDetails,
} from '@/lib/api/models';
import type { UploadedFile } from '@/lib/api/uploads';
import { kvStorage } from '@/lib/storage';

const PREFIX = 'mock_driver_db_v1:';

class Table<T> {
  private cache: Record<string, T> | null = null;

  constructor(private readonly name: string) {}

  private load(): Record<string, T> {
    if (this.cache) return this.cache;
    const raw = kvStorage.getString(PREFIX + this.name);
    try {
      this.cache = raw ? (JSON.parse(raw) as Record<string, T>) : {};
    } catch {
      this.cache = {};
    }
    return this.cache;
  }

  private save(): void {
    kvStorage.setString(PREFIX + this.name, JSON.stringify(this.cache ?? {}));
  }

  get(id: string): T | undefined {
    return this.load()[id];
  }

  all(): T[] {
    return Object.values(this.load());
  }

  set(id: string, value: T): T {
    this.load()[id] = value;
    this.save();
    return value;
  }

  update(id: string, patch: (current: T) => T): T | undefined {
    const current = this.get(id);
    if (current === undefined) return undefined;
    return this.set(id, patch(current));
  }
}

/** Server-side driver account; the public DriverProfile is derived from it. */
export interface DriverRecord {
  userId: string;
  joinedAt: string;
  isOnline: boolean;
  onlineSince: string | null;
  vehicle: VehicleDetails | null;
  kyc: KycDetails | null;
  bank: BankDetails | null;
  /** Full account number stays server-side. */
  bankAccountNumber: string | null;
  /** Local date (YYYY-MM-DD) → selfie URL. */
  dailyChecks: Record<string, string>;
  welcomeBonusSeen: boolean;
  welcomeBonusPaid: boolean;
  lastLocation: (GeoPoint & { recordedAt: string }) | null;
  /** When the dispatcher may send the next offer (epoch ms). */
  nextOfferAt: number | null;
  ratings: number[];
}

/** Everything needed to turn an offer into a job, including secrets the driver never sees. */
export interface OfferRecord extends JobOffer {
  driverId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  sender: { name: string; phone: string };
  paymentMethodLabel: string;
  commission: number;
  pickupOtp: string;
  deliveryOtp: string;
}

export interface JobRecord extends Omit<DriverJob, 'unreadMessages'> {
  driverId: string;
  pickupOtp: string;
  deliveryOtp: string;
  /** The simulated gateway confirms a QR payment at `paidAt` (epoch ms). */
  paymentQr: (PaymentQr & { paidAt: number }) | null;
}

/** A customer chat message the simulation will deliver later. */
export interface ScheduledMessage {
  text: string;
  deliverAt: number;
}

export interface OnlineSession {
  start: string;
  end: string | null;
}

export const db = {
  users: new Table<User>('users'),
  /** email → userId */
  usersByEmail: new Table<string>('users_by_email'),
  /** accessToken → session */
  sessions: new Table<Pick<AuthSession, 'accessToken' | 'refreshToken'> & { userId: string }>(
    'sessions',
  ),
  /** userId → driver account */
  drivers: new Table<DriverRecord>('drivers'),
  offers: new Table<OfferRecord>('offers'),
  /** orderId → job */
  jobs: new Table<JobRecord>('jobs'),
  /** orderId → messages */
  messages: new Table<ChatMessage[]>('messages'),
  /** orderId → customer messages not delivered yet */
  scheduledMessages: new Table<ScheduledMessage[]>('scheduled_messages'),
  /** userId → wallet ledger (newest first) */
  ledger: new Table<DriverTransaction[]>('ledger'),
  /** userId → online sessions */
  onlineSessions: new Table<OnlineSession[]>('online_sessions'),
  uploads: new Table<UploadedFile & { ownerId: string }>('uploads'),
};
