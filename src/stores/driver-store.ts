import { create } from 'zustand';

import { driverApi } from '@/lib/api/driver';
import { createSelectors } from '@/lib/create-selectors';
import { kvStorage } from '@/lib/storage';

const DRIVER_STORAGE_KEY = 'driver_state_v1';

export interface DriverVehicle {
  type: string;
  model: string;
  plateNumber: string;
  capacity: string;
  rcUploaded: boolean;
  photoUploaded: boolean;
}

export interface DriverKyc {
  panNumber: string;
  dlNumber: string;
  aadhaarUploaded: boolean;
  dlUploaded: boolean;
  selfieUploaded: boolean;
  verified: boolean;
}

export interface DriverBank {
  holderName: string;
  accountNumber: string;
  rawAccountNumber: string;
  ifscCode: string;
  chequeUploaded: boolean;
  verified: boolean;
}

export interface DailyCheck {
  completed: boolean;
  photoUri: string | null;
  rewardEarned: number;
}

export interface ChatMessage {
  id: string;
  sender: 'driver' | 'customer';
  text: string;
  time: string;
  status?: 'Delivered' | 'Read';
}

export interface JobRequest {
  id: string;
  vehicleType: string;
  pickupName: string;
  pickupAddress: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: { latitude: number; longitude: number };
  dropName: string;
  dropAddress: string;
  recipientName: string;
  recipientPhone: string;
  dropLocation: { latitude: number; longitude: number };
  distanceKm: number;
  durationMin: number;
  fare: number;
  driverEarning: number;
  paymentMode: 'Cash' | 'Prepaid';
  pickupOtp: string;
  dropOtp: string;
}

export type JobStatus =
  | 'idle'
  | 'incoming'
  | 'accepted'
  | 'arrived_pickup'
  | 'pickup_verified'
  | 'in_transit'
  | 'arrived_drop'
  | 'drop_verified'
  | 'completed';

export interface ActiveJob extends JobRequest {
  status: JobStatus;
  pickupPhoto: string | null;
  dropPhoto: string | null;
  chatMessages: ChatMessage[];
  paymentCollected: boolean;
}

export interface PastTrip {
  id: string;
  pickup: string;
  drop: string;
  dateStr: string;
  status: 'Completed' | 'Cancelled';
  fare: number;
  distanceKm: number;
  vehicleIconKey?: string;
}

export interface DriverState {
  isOnline: boolean;
  name: string;
  phone: string;
  rating: number;
  partnerSince: string;
  dob: string;
  city: string;
  vehicle: DriverVehicle;
  kyc: DriverKyc;
  bank: DriverBank;
  dailyCheck: DailyCheck;
  setupStatus: {
    vehicle: boolean;
    kyc: boolean;
    bank: boolean;
  };
  welcomeBonusDismissed: boolean;
  walletBalance: number;
  totalEarnings: number;
  tripsCount: number;
  onlineHours: string;
  incentives: number;
  availableRequests: JobRequest[];
  activeJob: ActiveJob | null;
  pastTrips: PastTrip[];

  // Actions
  setOnline: (online: boolean) => void;
  toggleOnline: () => void;
  dismissWelcomeBonus: () => void;
  claimWelcomeBonus: () => void;
  updateDriverDetails: (patch: { name?: string; dob?: string; city?: string }) => void;
  saveVehicleDetails: (data: Partial<DriverVehicle>) => void;
  saveKycDetails: (data: Partial<DriverKyc>) => void;
  saveBankDetails: (data: Partial<DriverBank>) => void;
  completeDailyCheck: (photoUri: string) => void;
  acceptJob: (job: JobRequest) => void;
  declineJob: (jobId: string) => void;
  updateJobStatus: (status: JobStatus) => void;
  setPickupPhoto: (photoUri: string) => void;
  setDropPhoto: (photoUri: string) => void;
  markPaymentCollected: () => void;
  completeTrip: () => void;
  addChatMessage: (text: string) => void;
  withdrawBalance: (amount?: number) => void;
  resetAll: () => void;
}

const DEFAULT_INITIAL_REQUESTS: JobRequest[] = [
  {
    id: 'MV-2048',
    vehicleType: 'Mini Truck · Delivery',
    pickupName: 'Hans Bhawan Wing-1, IP Estate',
    pickupAddress: 'Hans Bhawan Wing-1, IP Estate, New Delhi',
    customerName: 'Priya Sharma',
    customerPhone: '+91 98765 43210',
    pickupLocation: { latitude: 28.628, longitude: 77.2405 },
    dropName: 'DLF Cyber City, Phase 3, Gurugram',
    dropAddress: 'DLF Cyber City, Phase 3, Gurugram',
    recipientName: 'Rohit Mehra',
    recipientPhone: '+91 98123 45678',
    dropLocation: { latitude: 28.4955, longitude: 77.0891 },
    distanceKm: 18.4,
    durationMin: 48,
    fare: 620,
    driverEarning: 524,
    paymentMode: 'Cash',
    pickupOtp: '4829',
    dropOtp: '4829',
  },
  {
    id: 'MV-2051',
    vehicleType: 'Mini Truck · Delivery',
    pickupName: 'Connaught Place Outer Circle',
    pickupAddress: 'Block H, Connaught Place, New Delhi',
    customerName: 'Vikram Mehta',
    customerPhone: '+91 98987 65432',
    pickupLocation: { latitude: 28.6328, longitude: 77.2197 },
    dropName: 'Sector 62, Electronic City, Noida',
    dropAddress: 'Sector 62, Electronic City, Noida',
    recipientName: 'Sunita Rao',
    recipientPhone: '+91 98760 11223',
    dropLocation: { latitude: 28.627, longitude: 77.373 },
    distanceKm: 22.1,
    durationMin: 54,
    fare: 750,
    driverEarning: 635,
    paymentMode: 'Prepaid',
    pickupOtp: '3319',
    dropOtp: '3319',
  },
];

const DEFAULT_PAST_TRIPS: PastTrip[] = [
  {
    id: 'RY2841',
    pickup: 'Indiranagar',
    drop: 'Whitefield',
    dateStr: '21 Sep, 6:42 PM',
    status: 'Completed',
    fare: 620,
    distanceKm: 14.2,
    vehicleIconKey: 'mini-truck',
  },
  {
    id: 'RY2838',
    pickup: 'Koramangala',
    drop: 'HSR Layout',
    dateStr: '21 Sep, 3:18 PM',
    status: 'Completed',
    fare: 480,
    distanceKm: 6.8,
    vehicleIconKey: 'mini-truck',
  },
  {
    id: 'RY2829',
    pickup: 'Majestic',
    drop: 'Hebbal',
    dateStr: '20 Sep, 8:05 PM',
    status: 'Completed',
    fare: 710,
    distanceKm: 11.5,
    vehicleIconKey: 'mini-truck',
  },
  {
    id: 'RY2810',
    pickup: 'Market Street',
    drop: 'Ashok Nagar',
    dateStr: '29 May · 11:29 pm',
    status: 'Completed',
    fare: 18.4,
    distanceKm: 4.2,
    vehicleIconKey: 'mini-truck',
  },
  {
    id: 'RY2795',
    pickup: 'Indira Gandhi International Airport',
    drop: 'Saket District Centre',
    dateStr: '26 May · 4:11 am',
    status: 'Completed',
    fare: 283.82,
    distanceKm: 18.4,
    vehicleIconKey: 'bike',
  },
  {
    id: 'RY2780',
    pickup: 'C-5',
    drop: 'Sector 29',
    dateStr: '22 May · 9:02 am',
    status: 'Cancelled',
    fare: 0.0,
    distanceKm: 0.0,
    vehicleIconKey: 'e-rikshaw',
  },
];

const INITIAL_STATE = {
  isOnline: true,
  name: 'Arun Kumar',
  phone: '+91 98765 43210',
  rating: 4.93,
  partnerSince: 'May 2024',
  dob: '15 / 08 / 1994',
  city: 'Delhi NCR',
  vehicle: {
    type: 'Mini truck',
    model: 'Tata Ace Gold',
    plateNumber: 'KA 03 MX 2814',
    capacity: '600 kg',
    rcUploaded: true,
    photoUploaded: true,
  },
  kyc: {
    panNumber: 'ABCDE1234F',
    dlNumber: 'DL-0420190012345',
    aadhaarUploaded: true,
    dlUploaded: true,
    selfieUploaded: true,
    verified: true,
  },
  bank: {
    holderName: 'Arun Kumar',
    accountNumber: '•••• 4821',
    rawAccountNumber: '123456784821',
    ifscCode: 'HDFC0001234',
    chequeUploaded: true,
    verified: true,
  },
  dailyCheck: {
    completed: true,
    photoUri: null,
    rewardEarned: 50,
  },
  setupStatus: {
    vehicle: true,
    kyc: true,
    bank: true,
  },
  welcomeBonusDismissed: false,
  walletBalance: 6980,
  totalEarnings: 8460,
  tripsCount: 28,
  onlineHours: '21h 40m',
  incentives: 620,
  availableRequests: DEFAULT_INITIAL_REQUESTS,
  activeJob: null as ActiveJob | null,
  pastTrips: DEFAULT_PAST_TRIPS,
};

function loadStoredState(): typeof INITIAL_STATE {
  const raw = kvStorage.getString(DRIVER_STORAGE_KEY);
  if (!raw) return INITIAL_STATE;
  try {
    const parsed = JSON.parse(raw);
    return { ...INITIAL_STATE, ...parsed };
  } catch {
    return INITIAL_STATE;
  }
}

const _useDriverStore = create<DriverState>((set, get) => {
  const save = (patch: Partial<DriverState>) => {
    const next = { ...get(), ...patch };
    try {
      kvStorage.setString(DRIVER_STORAGE_KEY, JSON.stringify(next));
    } catch {}
    set(patch);
  };

  return {
    ...loadStoredState(),

    setOnline: (online) => {
      save({ isOnline: online });
      driverApi.updateStatus(online).catch(() => {});
    },
    toggleOnline: () => {
      const nextOnline = !get().isOnline;
      save({ isOnline: nextOnline });
      driverApi.updateStatus(nextOnline).catch(() => {});
    },

    dismissWelcomeBonus: () => save({ welcomeBonusDismissed: true }),
    claimWelcomeBonus: () => {
      const currentBalance = get().walletBalance;
      save({
        walletBalance: currentBalance + 1000,
        welcomeBonusDismissed: true,
      });
      driverApi.claimBonus().catch(() => {});
    },

    updateDriverDetails: (patch) => {
      save({
        name: patch.name ?? get().name,
        dob: patch.dob ?? get().dob,
        city: patch.city ?? get().city,
      });
    },

    saveVehicleDetails: (data) => {
      const vehicle = { ...get().vehicle, ...data };
      const setupStatus = { ...get().setupStatus, vehicle: true };
      save({ vehicle, setupStatus });
      driverApi.saveVehicle(data).catch(() => {});
    },

    saveKycDetails: (data) => {
      const kyc = { ...get().kyc, ...data, verified: true };
      const setupStatus = { ...get().setupStatus, kyc: true };
      save({ kyc, setupStatus });
      driverApi.saveKyc(data).catch(() => {});
    },

    saveBankDetails: (data) => {
      const bank = { ...get().bank, ...data, verified: true };
      const setupStatus = { ...get().setupStatus, bank: true };
      save({ bank, setupStatus });
      driverApi.saveBank(data).catch(() => {});
    },

    completeDailyCheck: (photoUri) => {
      const dailyCheck = { completed: true, photoUri, rewardEarned: 50 };
      const walletBalance = get().walletBalance + 50;
      const incentives = get().incentives + 50;
      save({ dailyCheck, walletBalance, incentives });
      driverApi.submitDailyCheck(photoUri).catch(() => {});
    },

    acceptJob: (job) => {
      const activeJob: ActiveJob = {
        ...job,
        status: 'accepted',
        pickupPhoto: null,
        dropPhoto: null,
        paymentCollected: false,
        chatMessages: [
          {
            id: 'm1',
            sender: 'customer',
            text: "Hi, I'm near Hans Bhawan but the main gate is busy.",
            time: '9:34 AM',
          },
          {
            id: 'm2',
            sender: 'driver',
            text: "I'm on Deen Dayal Marg now. Which entrance should I use?",
            time: '9:35 AM',
            status: 'Delivered',
          },
          {
            id: 'm3',
            sender: 'customer',
            text: "Please come to Wing-1, beside the tea stall. I'm wearing a blue kurta.",
            time: '9:36 AM',
          },
          {
            id: 'm4',
            sender: 'driver',
            text: 'Got it — I can see the Wing-1 sign. Reaching in about 2 minutes.',
            time: '9:37 AM',
            status: 'Read',
          },
        ],
      };
      const remainingRequests = get().availableRequests.filter((r) => r.id !== job.id);
      save({ activeJob, availableRequests: remainingRequests });
      driverApi.acceptJob(job.id).catch(() => {});
    },

    declineJob: (jobId) => {
      const remainingRequests = get().availableRequests.filter((r) => r.id !== jobId);
      save({ availableRequests: remainingRequests });
      driverApi.declineJob(jobId).catch(() => {});
    },

    updateJobStatus: (status) => {
      const current = get().activeJob;
      if (!current) return;
      save({ activeJob: { ...current, status } });
      driverApi.updateJobStatus(current.id, status).catch(() => {});
    },

    setPickupPhoto: (photoUri) => {
      const current = get().activeJob;
      if (!current) return;
      save({ activeJob: { ...current, pickupPhoto: photoUri } });
      driverApi.verifyPickup(current.id, current.pickupOtp, photoUri).catch(() => {});
    },

    setDropPhoto: (photoUri) => {
      const current = get().activeJob;
      if (!current) return;
      save({ activeJob: { ...current, dropPhoto: photoUri } });
    },

    markPaymentCollected: () => {
      const current = get().activeJob;
      if (!current) return;
      save({ activeJob: { ...current, paymentCollected: true } });
      driverApi
        .collectPayment(current.id, current.fare, current.paymentMode === 'Cash' ? 'Cash' : 'QR')
        .catch(() => {});
    },

    completeTrip: () => {
      const job = get().activeJob;
      if (!job) return;

      const newTrip: PastTrip = {
        id: `RY${job.id.slice(-4)}-${Date.now().toString().slice(-4)}`,
        pickup: job.pickupName.split(',')[0],
        drop: job.dropName.split(',')[0],
        dateStr:
          'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Completed',
        fare: job.driverEarning,
        distanceKm: job.distanceKm,
        vehicleIconKey: 'mini-truck',
      };

      save({
        activeJob: null,
        walletBalance: get().walletBalance + job.driverEarning,
        totalEarnings: get().totalEarnings + job.driverEarning,
        tripsCount: get().tripsCount + 1,
        pastTrips: [newTrip, ...get().pastTrips],
      });
      driverApi.verifyDrop(job.id, job.dropOtp, job.dropPhoto).catch(() => {});
    },

    addChatMessage: (text) => {
      const job = get().activeJob;
      if (!job) return;

      const newMsg: ChatMessage = {
        id: 'msg-' + Date.now(),
        sender: 'driver',
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Delivered',
      };

      save({
        activeJob: {
          ...job,
          chatMessages: [...job.chatMessages, newMsg],
        },
      });
      driverApi.sendChatMessage(job.id, text).catch(() => {});
    },

    withdrawBalance: (amount) => {
      const current = get().walletBalance;
      const withdrawAmount = amount ?? current;
      if (withdrawAmount <= 0) return;
      save({ walletBalance: Math.max(0, current - withdrawAmount) });
      driverApi.withdrawWallet(withdrawAmount).catch(() => {});
    },

    resetAll: () => {
      kvStorage.delete(DRIVER_STORAGE_KEY);
      set(INITIAL_STATE);
    },
  };
});

export const useDriverStore = createSelectors(_useDriverStore);
