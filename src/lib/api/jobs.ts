import { useLocationStore } from '@/stores/location-store';

import { request } from './client';
import type { ChatMessage, DriverJob, JobOffer, PaymentQr, VerifyStopInput } from './models';

function mapJobOffer(o: any): JobOffer {
  const fare = Number(o.quoted_amount ?? o.fare ?? 0);
  const tripDist = o.estimated_distance_meters
    ? Number((o.estimated_distance_meters / 1000).toFixed(1))
    : Number(o.tripDistanceKm ?? 0);
  const pickupDist = o.pickup_distance_meters
    ? Number((o.pickup_distance_meters / 1000).toFixed(1))
    : (o.pickupDistanceKm ?? 0);
  return {
    id: o.id,
    orderId: o.order_id ?? o.orderId ?? o.id,
    orderNumber: o.order_number ?? o.orderNumber ?? `RY-${String(o.id).slice(0, 6).toUpperCase()}`,
    createdAt: o.offered_at ?? o.createdAt ?? new Date().toISOString(),
    expiresAt: o.expires_at ?? o.expiresAt ?? new Date(Date.now() + 60000).toISOString(),
    vehicle: o.vehicle ?? { id: 'truck', name: o.vehicle_type_name ?? '', imageKey: 'truck' },
    pickup: o.pickup ?? { label: 'Pickup Point', location: null, houseNumber: '', contact: null },
    drop: o.drop ?? { label: 'Drop Point', location: null, houseNumber: '', contact: null },
    tripDistanceKm: tripDist,
    pickupDistanceKm: pickupDist,
    estimatedMinutes:
      o.estimatedMinutes ??
      (o.estimated_duration_seconds ? Math.ceil(o.estimated_duration_seconds / 60) : 0),
    fare,
    driverEarning: o.driver_earning ?? o.driverEarning ?? null,
    paymentMode: o.paymentMode ?? 'cash',
    paymentTiming: o.paymentTiming ?? 'on-delivery',
  };
}

function mapDriverJob(raw: any): DriverJob {
  if (!raw) return raw;
  return {
    id: raw.id,
    number:
      raw.number ??
      raw.order_number ??
      raw.orderNumber ??
      `RY-${String(raw.id).slice(0, 6).toUpperCase()}`,
    status: raw.status,
    acceptedAt: raw.accepted_at ?? raw.acceptedAt ?? new Date().toISOString(),
    vehicle: raw.vehicle ?? { id: 'truck', name: 'Mini Truck', imageKey: 'truck' },
    pickup: raw.pickup ?? {
      label: 'Pickup',
      location: null,
      houseNumber: '',
      contact: null,
    },
    drop: raw.drop ?? {
      label: 'Drop',
      location: null,
      houseNumber: '',
      contact: null,
    },
    sender: raw.sender ?? { name: 'Customer', phone: '' },
    route: raw.route ?? [],
    tripDistanceKm: Number(raw.trip_distance_km ?? raw.tripDistanceKm ?? 0),
    estimatedMinutes: Number(raw.estimated_minutes ?? raw.estimatedMinutes ?? 0),
    fare: Number(raw.fare ?? 0),
    driverEarning: raw.driver_earning ?? raw.driverEarning ?? null,
    commission: raw.commission ?? null,
    payment: raw.payment
      ? {
          // The backend reports an unpaid pay-on-delivery order as "prepaid" until a payment
          // exists; nothing has been paid, so the driver collects it.
          mode:
            raw.payment.status !== 'collected' && raw.payment.timing === 'on-delivery'
              ? 'cash'
              : (raw.payment.mode ?? 'cash'),
          timing: raw.payment.timing ?? 'on-delivery',
          amount: Number(raw.payment.amount ?? raw.fare ?? 0),
          methodLabel: raw.payment.method_label ?? raw.payment.methodLabel ?? 'Cash',
          status: raw.payment.status ?? 'pending',
          collectedVia: raw.payment.collected_via ?? raw.payment.collectedVia ?? null,
          collectedAt: raw.payment.collected_at ?? raw.payment.collectedAt ?? null,
        }
      : {
          mode: 'cash',
          timing: 'on-delivery',
          amount: Number(raw.fare ?? 0),
          methodLabel: 'Cash',
          status: 'pending',
          collectedVia: null,
          collectedAt: null,
        },
    pickupPhotoUrl: raw.pickup_photo_url ?? raw.pickupPhotoUrl ?? null,
    dropPhotoUrl: raw.drop_photo_url ?? raw.dropPhotoUrl ?? null,
    arrivedAtPickupAt: raw.arrived_at_pickup_at ?? raw.arrivedAtPickupAt ?? null,
    pickedUpAt: raw.picked_up_at ?? raw.pickedUpAt ?? null,
    arrivedAtDropAt: raw.arrived_at_drop_at ?? raw.arrivedAtDropAt ?? null,
    deliveredAt: raw.delivered_at ?? raw.deliveredAt ?? null,
    cancelledAt: raw.cancelled_at ?? raw.cancelledAt ?? null,
    cancelReason: raw.cancel_reason ?? raw.cancelReason ?? null,
    unreadMessages: Number(raw.unread_messages ?? raw.unreadMessages ?? 0),
    stops: Array.isArray(raw.stops)
      ? raw.stops.map((s: any) => ({
          stopId: s.stop_id ?? s.stopId ?? s.id,
          sequenceNumber: s.sequence_number ?? s.sequenceNumber ?? 1,
          stopType: s.stop_type ?? s.stopType ?? 'DROP',
          status: s.status ?? 'PENDING',
          label: s.label ?? '',
          addressLine1: s.address_line_1 ?? s.addressLine1 ?? null,
          addressLine2: s.address_line_2 ?? s.addressLine2 ?? null,
          landmark: s.landmark ?? null,
          location: s.location ?? null,
          contact: s.contact ? { name: s.contact.name, phone: s.contact.phone } : null,
          arrivedAt: s.arrived_at ?? s.arrivedAt ?? null,
          completedAt: s.completed_at ?? s.completedAt ?? null,
        }))
      : undefined,
    currentStopId: raw.current_stop_id ?? raw.currentStopId ?? null,
  };
}
/** Trip of the job last worked on — cash is recorded after delivery, when no trip is active. */
let lastTripId: string | null = null;

const TRIP_UNREACHABLE = 'Could not reach the trip. Check your connection and try again.';

/** The device's latest GPS fix — the backend geofences every arrival and handover against it. */
function devicePosition(): { latitude: number; longitude: number } {
  const fix = useLocationStore.getState().current;
  if (!fix) throw new Error('Waiting for your GPS location. Try again in a moment.');
  return { latitude: fix.latitude, longitude: fix.longitude };
}

interface ActiveTrip {
  tripId: string;
  status: string;
  /** The delivery stop the driver must serve next (null once all are done). */
  currentDrop: {
    stopId: string;
    /** 1-based position among the delivery stops. */
    number: number;
    location: { latitude: number; longitude: number };
    isFinal: boolean;
  } | null;
  dropCount: number;
}

/** The driver's active trip and its next delivery stop, straight from the backend. */
async function getActiveTripDetails(): Promise<ActiveTrip | null> {
  const now = new Date().toISOString();
  try {
    const locRes = await request<any>({
      method: 'POST',
      url: '/tracking/location',
      data: { ...devicePosition(), recorded_at: now },
    });
    if (!locRes?.trip_id) return null;
    lastTripId = locRes.trip_id;
    const tripRes = await request<any>({ url: `/trips/${locRes.trip_id}` });
    const drops: any[] = ((tripRes?.stops ?? []) as any[])
      .filter((stop) => stop.stop_type === 'DROP')
      .sort((a, b) => a.sequence_number - b.sequence_number);
    // Multi-stop: deliveries are served in order; the next one is the first not yet completed.
    const index = drops.findIndex((stop) => stop.status !== 'COMPLETED');
    const next = index >= 0 ? drops[index] : null;
    return {
      tripId: locRes.trip_id,
      status: tripRes?.status || '',
      dropCount: drops.length,
      currentDrop: next
        ? {
            stopId: next.order_stop_id,
            number: index + 1,
            location: { latitude: Number(next.latitude), longitude: Number(next.longitude) },
            isFinal: index === drops.length - 1,
          }
        : null,
    };
  } catch {}
  return null;
}

export const jobsApi = {
  /** Live offers for this driver (usually zero or one). */
  getOffers: async (signal?: AbortSignal): Promise<JobOffer[]> => {
    try {
      const res = await request<any[]>({ url: '/partner/offers', signal });
      if (Array.isArray(res)) return res.map(mapJobOffer);
      return [];
    } catch {
      try {
        const res = await request<any[]>({ url: '/driver/offers', signal });
        if (Array.isArray(res)) return res.map(mapJobOffer);
      } catch {}
      return [];
    }
  },

  acceptOffer: async (offerId: string): Promise<DriverJob> => {
    try {
      await request<any>({ method: 'POST', url: `/partner/offers/${offerId}/accept` });
    } catch {
      await request<any>({ method: 'POST', url: `/driver/offers/${offerId}/accept` });
    }
    const active = await jobsApi.getActiveJob();
    // Never invent a trip: without the real job there is nothing safe to show.
    if (!active) throw new Error('Trip accepted, but it could not be loaded. Pull to refresh.');
    return active;
  },

  rejectOffer: async (offerId: string, reason: string): Promise<null> => {
    try {
      return await request<null>({
        method: 'POST',
        url: `/partner/offers/${offerId}/reject`,
        data: { reason },
      });
    } catch {
      return request<null>({
        method: 'POST',
        url: `/driver/offers/${offerId}/reject`,
        data: { reason },
      });
    }
  },

  /** The job in progress, or null. */
  getActiveJob: async (signal?: AbortSignal): Promise<DriverJob | null> => {
    let raw: any = null;
    try {
      raw = await request<any>({ url: '/partner/jobs/active', signal });
    } catch {
      raw = await request<any>({ url: '/driver/jobs/active', signal });
    }
    if (!raw) return null;
    const job = mapDriverJob(raw);
    // If the backend already provided stops with current stop information, use it directly
    if (job.stops && job.stops.length > 0 && job.currentStopId) {
      const currentStop = job.stops.find((s) => s.stopId === job.currentStopId);
      if (currentStop && currentStop.stopType === 'DROP') {
        return {
          ...job,
          drop: {
            label: currentStop.label || `Stop ${currentStop.sequenceNumber}`,
            location: currentStop.location,
            houseNumber: currentStop.addressLine2 || '',
            contact: currentStop.contact,
          },
        };
      }
    }
    // Fallback: On a multi-stop trip, query trip details
    const trip = job.pickedUpAt ? await getActiveTripDetails() : null;
    const next = trip?.currentDrop;
    if (next && !next.isFinal && trip) {
      return {
        ...job,
        // The job contract reports arrival at a middle stop as still in transit.
        status:
          trip.status === 'ARRIVED_AT_STOP' || trip.status === 'STOP_SERVICE_IN_PROGRESS'
            ? 'arrived_at_drop'
            : job.status,
        drop: {
          label: `Stop ${next.number} of ${trip.dropCount}`,
          location: next.location,
          houseNumber: '',
          contact: null,
        },
      };
    }
    return job;
  },

  getJob: async (id: string, signal?: AbortSignal): Promise<DriverJob> => {
    const active = await jobsApi.getActiveJob(signal);
    if (active && (active.id === id || active.number === id)) return active;
    try {
      return mapDriverJob(await request<any>({ url: `/partner/jobs/${id}`, signal }));
    } catch {
      return mapDriverJob(await request<any>({ url: `/driver/jobs/${id}`, signal }));
    }
  },

  arriveAtPickup: async (id: string): Promise<DriverJob> => {
    const trip = await getActiveTripDetails();
    if (!trip?.tripId) throw new Error(TRIP_UNREACHABLE);
    if (trip.status === 'ASSIGNED') {
      try {
        await request<any>({ method: 'POST', url: `/trips/${trip.tripId}/en-route-pickup` });
      } catch {}
    }
    // Not swallowed: the backend rejects an arrival away from the stop.
    await request<any>({
      method: 'POST',
      url: `/trips/${trip.tripId}/arrived-pickup`,
      data: devicePosition(),
    });
    const active = await jobsApi.getActiveJob();
    return active ?? mapDriverJob({ id, status: 'arrived_at_pickup' });
  },

  verifyPickup: async (id: string, input: VerifyStopInput): Promise<DriverJob> => {
    const trip = await getActiveTripDetails();
    if (!trip?.tripId) throw new Error(TRIP_UNREACHABLE);
    try {
      await request<any>({ method: 'POST', url: `/trips/${trip.tripId}/pickup/start` });
    } catch {}
    // Not swallowed: a wrong code must fail here, never count as verified.
    await request<any>({
      method: 'POST',
      url: `/trips/${trip.tripId}/pickup/verify`,
      data: { otp: input.otp, ...devicePosition() },
    });
    try {
      await request<any>({ method: 'POST', url: `/trips/${trip.tripId}/start` });
    } catch {}
    const active = await jobsApi.getActiveJob();
    return active ?? mapDriverJob({ id, status: 'pickup_complete' });
  },

  arriveAtDrop: async (id: string): Promise<DriverJob> => {
    const trip = await getActiveTripDetails();
    if (!trip?.tripId || !trip.currentDrop) throw new Error(TRIP_UNREACHABLE);
    // After a completed stop the backend wants the trip back in transit before the next arrival.
    if (trip.status === 'STOP_COMPLETED' || trip.status === 'PICKED_UP') {
      try {
        await request<any>({ method: 'POST', url: `/trips/${trip.tripId}/start` });
      } catch {}
    }
    // Not swallowed: the backend rejects an arrival away from the stop.
    await request<any>({
      method: 'POST',
      url: `/trips/${trip.tripId}/stops/${trip.currentDrop.stopId}/arrive`,
      data: devicePosition(),
    });
    try {
      await request<any>({
        method: 'POST',
        url: `/trips/${trip.tripId}/stops/${trip.currentDrop.stopId}/start-service`,
      });
    } catch {}
    const active = await jobsApi.getActiveJob();
    return active ?? mapDriverJob({ id, status: 'arrived_at_drop' });
  },

  verifyDrop: async (id: string, input: VerifyStopInput): Promise<DriverJob> => {
    const before = await jobsApi.getActiveJob().catch(() => null);
    const trip = await getActiveTripDetails();
    if (!trip?.tripId) throw new Error(TRIP_UNREACHABLE);
    // Not swallowed: a wrong code must fail here, never count as delivered.
    await request<any>({
      method: 'POST',
      url: `/trips/${trip.tripId}/complete`,
      data: {
        otp: input.otp,
        recipient_name: 'Receiver',
        ...devicePosition(),
      },
    });
    const active = await jobsApi.getActiveJob();
    if (active) return active;
    // Delivered jobs can't be re-fetched yet: keep the real job as it was, marked delivered.
    return before
      ? { ...before, status: 'delivered', deliveredAt: new Date().toISOString() }
      : mapDriverJob({ id, status: 'delivered' });
  },

  cancel: async (id: string, reason: string): Promise<DriverJob> => {
    const before = await jobsApi.getActiveJob();
    if (
      before?.pickedUpAt ||
      before?.status === 'pickup_complete' ||
      before?.status === 'arrived_at_drop'
    ) {
      throw new Error('Trip cannot be cancelled after pickup. You must complete the delivery.');
    }
    const trip = await getActiveTripDetails();
    if (!trip?.tripId) throw new Error(TRIP_UNREACHABLE);
    await request<any>({ method: 'POST', url: `/trips/${trip.tripId}/cancel`, data: { reason } });
    // The cancelled job is no longer "active", so keep the real one as it was.
    return before
      ? {
          ...before,
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelReason: reason,
        }
      : mapDriverJob({ id, status: 'cancelled' });
  },

  createPaymentQr: async (id: string): Promise<PaymentQr> => {
    return request<PaymentQr>({ method: 'POST', url: `/driver/jobs/${id}/payment/qr` });
  },

  /** Records cash received for a stop whose code is already verified. */
  collectCash: async (job: DriverJob): Promise<DriverJob> => {
    const tripId = (await getActiveTripDetails())?.tripId ?? lastTripId;
    if (!tripId) throw new Error(TRIP_UNREACHABLE);
    await request<any>({
      method: 'POST',
      url: '/payments/cash-collections',
      data: { trip_id: tripId },
    });
    return {
      ...job,
      payment: {
        ...job.payment,
        mode: 'cash',
        methodLabel: 'Cash',
        status: 'collected',
        collectedVia: 'cash',
        collectedAt: new Date().toISOString(),
      },
    };
  },

  getMessages: async (id: string, signal?: AbortSignal): Promise<ChatMessage[]> => {
    try {
      const res = await request<any>({ url: `/orders/${id}/chat/messages`, signal });
      const items = res?.items ?? (Array.isArray(res) ? res : []);
      return items.map((m: any) => ({
        id: m.id,
        orderId: id,
        sender: m.sender_type === 'DRIVER' || m.sender === 'driver' ? 'driver' : 'customer',
        text: m.body ?? m.text ?? m.message ?? '',
        createdAt: m.created_at ?? m.createdAt ?? new Date().toISOString(),
        readAt: m.read_at ?? m.readAt ?? null,
      }));
    } catch {
      return [];
    }
  },

  sendMessage: async (id: string, text: string): Promise<ChatMessage> => {
    const res = await request<any>({
      method: 'POST',
      url: `/orders/${id}/chat/messages`,
      data: { body: text },
    });
    return {
      id: res.id,
      orderId: id,
      sender: 'driver',
      text: res.body ?? text,
      createdAt: res.created_at ?? new Date().toISOString(),
      readAt: null,
    };
  },

  markMessagesRead: (id: string) => {
    return request<null>({ method: 'POST', url: `/orders/${id}/chat/read` });
  },
};
