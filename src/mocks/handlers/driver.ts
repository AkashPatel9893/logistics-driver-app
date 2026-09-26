import type {
  DriverActiveJobModel,
  DriverBankModel,
  DriverChatMessageModel,
  DriverJobRequestModel,
  DriverKycModel,
  DriverPastTripModel,
  DriverProfileModel,
  DriverVehicleModel,
} from '@/lib/api/models';

import { db } from '../db';
import { body, HttpError, ok, randomId } from '../http';
import type { Route } from './types';

const INITIAL_DRIVER_PROFILE: DriverProfileModel = {
  id: 'drv_001',
  name: 'Arun Kumar',
  phone: '+91 98765 43210',
  rating: 4.93,
  partnerSince: 'May 2024',
  dob: '15 / 08 / 1994',
  city: 'Delhi NCR',
  isOnline: true,
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
};

const INITIAL_REQUESTS: DriverJobRequestModel[] = [
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

const INITIAL_PAST_TRIPS: DriverPastTripModel[] = [
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
];

function getProfile(): DriverProfileModel {
  let profile = db.driverProfile.get('main');
  if (!profile) {
    profile = db.driverProfile.set('main', INITIAL_DRIVER_PROFILE);
  }
  return profile;
}

function getRequests(): DriverJobRequestModel[] {
  let requests = db.driverRequests.get('list');
  if (!requests) {
    requests = db.driverRequests.set('list', INITIAL_REQUESTS);
  }
  return requests;
}

function getActiveJob(): DriverActiveJobModel | null {
  return db.driverActiveJob.get('current') ?? null;
}

function getTrips(): DriverPastTripModel[] {
  let trips = db.driverPastTrips.get('history');
  if (!trips) {
    trips = db.driverPastTrips.set('history', INITIAL_PAST_TRIPS);
  }
  return trips;
}

export const driverRoutes: Route[] = [
  {
    method: 'GET',
    path: '/driver/profile',
    handler: () => ok(getProfile()),
  },
  {
    method: 'PATCH',
    path: '/driver/status',
    handler: (req) => {
      const input = body<{ isOnline: boolean }>(req);
      const profile = getProfile();
      profile.isOnline = input.isOnline;
      db.driverProfile.set('main', profile);
      return ok({ isOnline: profile.isOnline });
    },
  },
  {
    method: 'GET',
    path: '/driver/requests',
    handler: () => ok(getRequests()),
  },
  {
    method: 'POST',
    path: '/driver/jobs/:id/accept',
    handler: (req) => {
      const jobId = req.params.id;
      const requests = getRequests();
      const job = requests.find((r) => r.id === jobId);
      if (!job) {
        throw new HttpError(404, 'JOB_NOT_FOUND', 'Job request no longer available.');
      }
      const updatedRequests = requests.filter((r) => r.id !== jobId);
      db.driverRequests.set('list', updatedRequests);

      const activeJob: DriverActiveJobModel = {
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
        ],
      };
      db.driverActiveJob.set('current', activeJob);
      return ok(activeJob);
    },
  },
  {
    method: 'POST',
    path: '/driver/jobs/:id/decline',
    handler: (req) => {
      const jobId = req.params.id;
      const requests = getRequests();
      const updated = requests.filter((r) => r.id !== jobId);
      db.driverRequests.set('list', updated);
      return ok({ success: true });
    },
  },
  {
    method: 'PATCH',
    path: '/driver/jobs/:id/status',
    handler: (req) => {
      const active = getActiveJob();
      if (!active || active.id !== req.params.id) {
        throw new HttpError(404, 'JOB_NOT_FOUND', 'Active job not found.');
      }
      const input = body<{ status: DriverActiveJobModel['status'] }>(req);
      active.status = input.status;
      db.driverActiveJob.set('current', active);
      return ok(active);
    },
  },
  {
    method: 'POST',
    path: '/driver/jobs/:id/verify-pickup',
    handler: (req) => {
      const active = getActiveJob();
      if (!active || active.id !== req.params.id) {
        throw new HttpError(404, 'JOB_NOT_FOUND', 'Active job not found.');
      }
      const input = body<{ otp: string; photoUri?: string }>(req);
      if (input.otp !== active.pickupOtp && input.otp !== '4829') {
        throw new HttpError(422, 'INVALID_OTP', 'Incorrect pickup verification code.');
      }
      active.status = 'pickup_verified';
      if (input.photoUri) active.pickupPhoto = input.photoUri;
      db.driverActiveJob.set('current', active);
      return ok(active);
    },
  },
  {
    method: 'POST',
    path: '/driver/jobs/:id/verify-drop',
    handler: (req) => {
      const active = getActiveJob();
      if (!active || active.id !== req.params.id) {
        throw new HttpError(404, 'JOB_NOT_FOUND', 'Active job not found.');
      }
      const input = body<{ otp: string; photoUri?: string }>(req);
      if (input.otp !== active.dropOtp && input.otp !== '7319') {
        throw new HttpError(422, 'INVALID_OTP', 'Incorrect delivery verification code.');
      }
      active.status = 'completed';
      if (input.photoUri) active.dropPhoto = input.photoUri;

      const profile = getProfile();
      profile.tripsCount += 1;
      profile.totalEarnings += active.driverEarning;
      profile.walletBalance += active.driverEarning;
      db.driverProfile.set('main', profile);

      const pastTrips = getTrips();
      pastTrips.unshift({
        id: `RY${Math.floor(1000 + Math.random() * 9000)}`,
        pickup: active.pickupName,
        drop: active.dropName,
        dateStr: 'Today, Just now',
        status: 'Completed',
        fare: active.driverEarning,
        distanceKm: active.distanceKm,
        vehicleIconKey: 'mini-truck',
      });
      db.driverPastTrips.set('history', pastTrips);
      db.driverActiveJob.set('current', null);
      return ok(active);
    },
  },
  {
    method: 'POST',
    path: '/driver/jobs/:id/collect-payment',
    handler: (req) => {
      const active = getActiveJob();
      if (!active || active.id !== req.params.id) {
        throw new HttpError(404, 'JOB_NOT_FOUND', 'Active job not found.');
      }
      active.paymentCollected = true;
      db.driverActiveJob.set('current', active);

      const profile = getProfile();
      return ok({ collected: true, newBalance: profile.walletBalance });
    },
  },
  {
    method: 'POST',
    path: '/driver/jobs/:id/chat',
    handler: (req) => {
      const active = getActiveJob();
      if (!active || active.id !== req.params.id) {
        throw new HttpError(404, 'JOB_NOT_FOUND', 'Active job not found.');
      }
      const input = body<{ text: string }>(req);
      const newMsg: DriverChatMessageModel = {
        id: randomId('msg'),
        sender: 'driver',
        text: input.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Delivered',
      };
      active.chatMessages.push(newMsg);
      db.driverActiveJob.set('current', active);
      return ok(newMsg);
    },
  },
  {
    method: 'POST',
    path: '/driver/vehicle',
    handler: (req) => {
      const input = body<Partial<DriverVehicleModel>>(req);
      const profile = getProfile();
      profile.vehicle = { ...profile.vehicle, ...input };
      profile.setupStatus.vehicle = true;
      db.driverProfile.set('main', profile);
      return ok(profile.vehicle);
    },
  },
  {
    method: 'POST',
    path: '/driver/kyc',
    handler: (req) => {
      const input = body<Partial<DriverKycModel>>(req);
      const profile = getProfile();
      profile.kyc = { ...profile.kyc, ...input, verified: true };
      profile.setupStatus.kyc = true;
      db.driverProfile.set('main', profile);
      return ok(profile.kyc);
    },
  },
  {
    method: 'POST',
    path: '/driver/bank',
    handler: (req) => {
      const input = body<Partial<DriverBankModel>>(req);
      const profile = getProfile();
      profile.bank = { ...profile.bank, ...input, verified: true };
      profile.setupStatus.bank = true;
      db.driverProfile.set('main', profile);
      return ok(profile.bank);
    },
  },
  {
    method: 'POST',
    path: '/driver/daily-check',
    handler: (req) => {
      const input = body<{ photoUri: string }>(req);
      const profile = getProfile();
      profile.dailyCheck = { completed: true, photoUri: input.photoUri, rewardEarned: 50 };
      profile.walletBalance += 50;
      profile.incentives += 50;
      db.driverProfile.set('main', profile);
      return ok(profile.dailyCheck);
    },
  },
  {
    method: 'GET',
    path: '/driver/trips',
    handler: () => ok(getTrips()),
  },
  {
    method: 'POST',
    path: '/driver/wallet/withdraw',
    handler: (req) => {
      const input = body<{ amount: number }>(req);
      const profile = getProfile();
      if (profile.walletBalance < input.amount) {
        throw new HttpError(
          422,
          'INSUFFICIENT_FUNDS',
          'Insufficient wallet balance for withdrawal.',
        );
      }
      profile.walletBalance -= input.amount;
      db.driverProfile.set('main', profile);
      return ok({ newBalance: profile.walletBalance, txId: randomId('wtx') });
    },
  },
  {
    method: 'POST',
    path: '/driver/bonus/claim',
    handler: () => {
      const profile = getProfile();
      if (!profile.welcomeBonusDismissed) {
        profile.walletBalance += 1000;
        profile.welcomeBonusDismissed = true;
        db.driverProfile.set('main', profile);
      }
      return ok({ newBalance: profile.walletBalance, bonus: 1000 });
    },
  },
];
