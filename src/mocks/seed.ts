/**
 * Seed data for the in-app mock backend. In production all of this lives in
 * the backend; the app only ever sees it through the API (see docs/API.md).
 *
 * Rates, vehicle ids and places match the customer app's mock so an order
 * priced there would be offered here at the same fare.
 */
import type { GeoPoint, LanguageOption, SupportInfo, VehicleTypeOption } from '@/lib/api/models';

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
];

/** Demo OTP accepted by the mock server for any email. */
export const DEMO_OTP = '1234';
export const OTP_LENGTH = 4;
export const OTP_RESEND_SECONDS = 24;

export const VEHICLE_TYPES: VehicleTypeOption[] = [
  { id: 'bike', name: 'Bike', capacityKg: 20, imageKey: 'bike' },
  { id: 'e-rikshaw', name: 'e-Rikshaw', capacityKg: 300, imageKey: 'e-rikshaw' },
  { id: 'mini-truck', name: 'Mini Truck', capacityKg: 600, imageKey: 'mini-truck' },
  { id: 'pickup-truck', name: 'Pickup Truck', capacityKg: 1000, imageKey: 'pickup-truck' },
  { id: 'large-truck', name: 'Large Truck', capacityKg: 2500, imageKey: 'large-truck' },
];

export interface RideRate {
  vehicleId: string;
  baseFare: number;
  perKmRate: number;
  /** Flat fare when the trip distance is unknown. */
  flatFare: number;
}

/** Same rate card as the customer app's mock (Logistics-app/src/mocks/seed.ts). */
export const RIDE_RATES: RideRate[] = [
  { vehicleId: 'bike', baseFare: 49, perKmRate: 10, flatFare: 89 },
  { vehicleId: 'e-rikshaw', baseFare: 99, perKmRate: 16, flatFare: 159 },
  { vehicleId: 'mini-truck', baseFare: 199, perKmRate: 22, flatFare: 299 },
  { vehicleId: 'pickup-truck', baseFare: 249, perKmRate: 28, flatFare: 369 },
  { vehicleId: 'large-truck', baseFare: 499, perKmRate: 45, flatFare: 699 },
];

/** Platform commission taken from each fare. */
export const COMMISSION_RATE = 0.2;

export interface SeedPlace {
  name: string;
  address: string;
  location: GeoPoint;
}

/** Delhi NCR pickup/drop points (same list the customer app searches). */
export const PLACES: SeedPlace[] = [
  {
    name: 'Connaught Place',
    address: 'Rajiv Chowk, New Delhi',
    location: { latitude: 28.6315, longitude: 77.2167 },
  },
  {
    name: 'India Gate',
    address: 'Kartavya Path, New Delhi',
    location: { latitude: 28.6129, longitude: 77.2295 },
  },
  {
    name: 'Hans Bhawan',
    address: 'Wing-1, IP Estate, New Delhi',
    location: { latitude: 28.628, longitude: 77.2405 },
  },
  {
    name: 'Karol Bagh Market',
    address: 'Ajmal Khan Road, Karol Bagh, New Delhi',
    location: { latitude: 28.6519, longitude: 77.1909 },
  },
  {
    name: 'Chandni Chowk',
    address: 'Old Delhi, New Delhi',
    location: { latitude: 28.6506, longitude: 77.2303 },
  },
  {
    name: 'Select Citywalk',
    address: 'Saket District Centre, New Delhi',
    location: { latitude: 28.5287, longitude: 77.2193 },
  },
  {
    name: 'Nehru Place',
    address: 'Nehru Place, New Delhi',
    location: { latitude: 28.5491, longitude: 77.2533 },
  },
  {
    name: 'IGI Airport T3',
    address: 'Indira Gandhi International Airport, New Delhi',
    location: { latitude: 28.5562, longitude: 77.1 },
  },
  {
    name: 'Sector 18 Market',
    address: 'Sector 18, Noida',
    location: { latitude: 28.5708, longitude: 77.3261 },
  },
  {
    name: 'Cyber Hub',
    address: 'DLF Cyber City, Gurugram',
    location: { latitude: 28.4955, longitude: 77.0891 },
  },
  {
    name: 'Lajpat Nagar Central Market',
    address: 'Lajpat Nagar II, New Delhi',
    location: { latitude: 28.5677, longitude: 77.2433 },
  },
  {
    name: 'Rajouri Garden',
    address: 'Main Market, Rajouri Garden, New Delhi',
    location: { latitude: 28.6415, longitude: 77.1209 },
  },
];

/** Service-area centre used when the driver's location is unknown or far away. */
export const SERVICE_AREA_CENTER: GeoPoint = { latitude: 28.6139, longitude: 77.209 };

/** Customers placing orders in the simulation (the customer app's users). */
export const CUSTOMERS: { name: string; phone: string }[] = [
  { name: 'Priya Sharma', phone: '+919810023411' },
  { name: 'Rohit Mehra', phone: '+919811245678' },
  { name: 'Ananya Gupta', phone: '+919899104532' },
  { name: 'Vikram Malhotra', phone: '+919873365120' },
  { name: 'Sunita Rao', phone: '+919876011223' },
  { name: 'Arjun Kapoor', phone: '+919958842210' },
  { name: 'Neha Bansal', phone: '+919711563098' },
  { name: 'Karan Sethi', phone: '+919650478812' },
  { name: 'Meera Iyer', phone: '+919818330971' },
  { name: 'Aditya Verma', phone: '+919999218840' },
];

export const HOUSE_NUMBERS = [
  'Shop 12, Ground floor',
  'Flat 402, Tower B',
  'Gate 3, Warehouse 7',
  'Office 214, 2nd floor',
  'House 56, Block C',
  'Stall 9, Main lane',
  'Plot 88, Service road',
];

export const PREPAID_METHOD_LABELS = ['UPI', 'Card', 'RYNO Wallet', 'Paytm'];

/** Where UPI QR payments are collected (the platform's merchant VPA). */
export const UPI_PAYEE = { vpa: 'rynologistics@icici', name: 'RYNO Logistics' };

export const SUPPORT_INFO: SupportInfo = {
  phone: '+911800120120',
  email: 'partners@ryno.in',
  faqs: [
    {
      id: 'faq-online',
      question: "Why can't I go online?",
      answer:
        'You can go online once your vehicle, KYC and bank details are verified. Check the setup card on the home screen for anything still pending.',
    },
    {
      id: 'faq-otp',
      question: 'The customer does not have the OTP',
      answer:
        'The sender sees the pickup OTP in the RYNO app; the receiver gets the delivery OTP in the tracking link. Ask them to open it. Never complete a stop without the OTP.',
    },
    {
      id: 'faq-cash',
      question: 'How does cash collection work?',
      answer:
        'For cash orders, collect the fare shown in the app (or show the UPI QR). The platform commission on cash trips is deducted from your wallet.',
    },
    {
      id: 'faq-payout',
      question: 'When do I get paid?',
      answer:
        'Earnings from online-paid trips go to your RYNO wallet right after delivery. Withdraw anytime above ₹100; it reaches your bank within 2 hours.',
    },
    {
      id: 'faq-cancel',
      question: 'Can I cancel a trip?',
      answer:
        'You can cancel before pickup if the customer is unreachable or the parcel is not as described. Frequent cancellations lower your priority.',
    },
  ],
};
