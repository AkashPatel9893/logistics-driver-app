import { useLocationStore } from '@/stores/location-store';

import { ApiError } from './api-error';
import { request } from './client';
import type { ChatMessage, DriverJob, JobOffer, PaymentQr, VerifyStopInput } from './models';

/** The backend sends `{label, latitude, longitude}`; the UI reads `{label, location, houseNumber, contact}`. */
function toOrderStop(place: any, fallbackLabel: string) {
  if (place.location !== undefined) return place;
  // Coordinates may arrive as numbers or as decimal strings.
  const latitude = place.latitude == null ? NaN : Number(place.latitude);
  const longitude = place.longitude == null ? NaN : Number(place.longitude);
  const hasFix = Number.isFinite(latitude) && Number.isFinite(longitude);
  return {
    label: place.label ?? fallbackLabel,
    location: hasFix ? { latitude, longitude } : null,
    houseNumber: place.house_number ?? place.houseNumber ?? '',
    contact: place.contact ?? null,
  };
}

export function mapJobOffer(o: any): JobOffer {
  if (
    o.quoted_amount == null ||
    !o.expires_at ||
    !o.offered_at ||
    !o.order_number ||
    !o.pickup ||
    !o.drop ||
    o.estimated_distance_meters == null ||
    o.estimated_duration_seconds == null ||
    !o.payment_mode ||
    !o.payment_timing
  ) {
    throw new ApiError('Offer details are unavailable. Please refresh.', 'unknown');
  }
  const fare = Number(o.quoted_amount);
  const tripDist =
    o.estimated_distance_meters != null
      ? Number((o.estimated_distance_meters / 1000).toFixed(1))
      : Number(o.tripDistanceKm ?? 0);
  const pickupDist =
    o.pickup_distance_meters != null
      ? Number((o.pickup_distance_meters / 1000).toFixed(1))
      : (o.pickupDistanceKm ?? null);
  return {
    id: o.id,
    orderId: o.order_id ?? o.orderId ?? o.id,
    orderNumber: o.order_number,
    createdAt: o.offered_at,
    expiresAt: o.expires_at,
    extraStops: Math.max(0, Number(o.stop_count ?? 2) - 2),
    vehicle: o.vehicle ?? { id: 'truck', name: o.vehicle_type_name ?? '', imageKey: 'truck' },
    pickup: toOrderStop(o.pickup, 'Pickup Point'),
    drop: toOrderStop(o.drop, 'Drop Point'),
    tripDistanceKm: tripDist,
    pickupDistanceKm: pickupDist,
    estimatedMinutes:
      o.estimatedMinutes ??
      (o.estimated_duration_seconds ? Math.ceil(o.estimated_duration_seconds / 60) : 0),
    fare,
    driverEarning: o.driver_earning ?? o.driverEarning ?? null,
    paymentMode: o.payment_mode,
    paymentTiming: o.payment_timing,
  };
}

function mapDriverJob(raw: any): DriverJob {
  if (!raw) return raw;
  if (
    !raw.payment ||
    !raw.payment.mode ||
    !raw.payment.timing ||
    raw.payment.amount == null ||
    !raw.payment.status ||
    !raw.vehicle ||
    raw.trip_distance_km == null ||
    raw.estimated_minutes == null ||
    raw.fare == null ||
    !raw.status ||
    !raw.number ||
    !raw.pickup ||
    !raw.drop ||
    !raw.sender
  ) {
    throw new ApiError('Trip or payment details are unavailable. Please refresh.', 'unknown');
  }
  return {
    id: raw.id,
    number:
      raw.number ??
      raw.order_number ??
      raw.orderNumber ??
      `RY-${String(raw.id).slice(0, 6).toUpperCase()}`,
    status: raw.status,
    acceptedAt: raw.accepted_at ?? raw.acceptedAt ?? null,
    vehicle: raw.vehicle,
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
    payment: {
      mode: raw.payment.mode,
      timing: raw.payment.timing,
      amount: Number(raw.payment.amount),
      methodLabel: raw.payment.method_label ?? raw.payment.methodLabel ?? '',
      status: raw.payment.status,
      collectedVia: raw.payment.collected_via ?? raw.payment.collectedVia ?? null,
      collectedAt: raw.payment.collected_at ?? raw.payment.collectedAt ?? null,
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
/**
 * What verify-code says to collect (the fare plus any waiting charge), by job id. The job record
 * still carries the quoted amount, and the job is re-fetched every few seconds, so without this the
 * collect screen fell back to the quote and the driver under-collected.
 */
const amountToCollect = new Map<string, number>();

function withAmountToCollect(job: DriverJob): DriverJob {
  const amount = amountToCollect.get(job.id);
  return amount === undefined ? job : { ...job, payment: { ...job.payment, amount } };
}

const TRIP_UNREACHABLE = 'Could not reach the trip. Check your connection and try again.';

/** The device's latest GPS fix — the backend geofences every arrival and handover against it. */
function devicePosition(): { latitude: number; longitude: number } {
  const fix = useLocationStore.getState().current;
  if (!fix) throw new ApiError('Waiting for your GPS location. Try again in a moment.', 'unknown');
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
    const res = await request<any[]>({ url: '/partner/offers', signal });
    return res.map(mapJobOffer);
  },

  acceptOffer: async (offerId: string): Promise<DriverJob> => {
    await request<any>({ method: 'POST', url: `/partner/offers/${offerId}/accept` });
    const active = await jobsApi.getActiveJob();
    // Never invent a trip: without the real job there is nothing safe to show.
    if (!active) throw new Error('Trip accepted, but it could not be loaded. Pull to refresh.');
    return active;
  },

  rejectOffer: async (offerId: string, reason: string): Promise<null> => {
    return request<null>({
      method: 'POST',
      url: `/partner/offers/${offerId}/reject`,
      data: { reason },
    });
  },

  /** The job in progress, or null. */
  getActiveJob: async (signal?: AbortSignal): Promise<DriverJob | null> => {
    const raw = await request<any>({ url: '/partner/jobs/active', signal });
    if (!raw) return null;
    const job = withAmountToCollect(mapDriverJob(raw));
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
      return withAmountToCollect(
        mapDriverJob(await request<any>({ url: `/partner/jobs/${id}`, signal })),
      );
    } catch {
      return withAmountToCollect(
        mapDriverJob(await request<any>({ url: `/driver/jobs/${id}`, signal })),
      );
    }
  },

  arriveAtPickup: async (_id: string): Promise<DriverJob> => {
    const trip = await getActiveTripDetails();
    if (!trip?.tripId) throw new ApiError(TRIP_UNREACHABLE, 'unknown');
    if (trip.status === 'ASSIGNED') {
      await request<any>({ method: 'POST', url: `/trips/${trip.tripId}/en-route-pickup` });
    }
    // Not swallowed: the backend rejects an arrival away from the stop.
    if (trip.status !== 'ARRIVED_AT_PICKUP') {
      await request<any>({
        method: 'POST',
        url: `/trips/${trip.tripId}/arrived-pickup`,
        data: devicePosition(),
      });
    }
    const active = await jobsApi.getActiveJob();
    if (!active)
      throw new ApiError('Trip updated, but it could not be loaded. Refresh to retry.', 'unknown');
    return active;
  },

  verifyPickup: async (_id: string, input: VerifyStopInput): Promise<DriverJob> => {
    const trip = await getActiveTripDetails();
    if (!trip?.tripId) throw new ApiError(TRIP_UNREACHABLE, 'unknown');
    if (trip.status === 'ARRIVED_AT_PICKUP') {
      await request<any>({ method: 'POST', url: `/trips/${trip.tripId}/pickup/start` });
    }
    // Not swallowed: a wrong code must fail here, never count as verified.
    if (!['PICKED_UP', 'IN_TRANSIT'].includes(trip.status)) {
      await request<any>({
        method: 'POST',
        url: `/trips/${trip.tripId}/pickup/verify`,
        data: { otp: input.otp, ...devicePosition() },
      });
    }
    if (trip.status !== 'IN_TRANSIT') {
      await request<any>({ method: 'POST', url: `/trips/${trip.tripId}/start` });
    }
    const active = await jobsApi.getActiveJob();
    if (!active)
      throw new ApiError('Trip updated, but it could not be loaded. Refresh to retry.', 'unknown');
    return active;
  },

  arriveAtDrop: async (_id: string): Promise<DriverJob> => {
    const trip = await getActiveTripDetails();
    if (!trip?.tripId || !trip.currentDrop) throw new ApiError(TRIP_UNREACHABLE, 'unknown');
    // After a completed stop the backend wants the trip back in transit before the next arrival.
    if (trip.status === 'STOP_COMPLETED' || trip.status === 'PICKED_UP') {
      await request<any>({ method: 'POST', url: `/trips/${trip.tripId}/start` });
    }
    // Not swallowed: the backend rejects an arrival away from the stop.
    const serviceStarted = ['STOP_SERVICE_IN_PROGRESS', 'DELIVERY_IN_PROGRESS'].includes(
      trip.status,
    );
    if (
      !serviceStarted &&
      !['ARRIVED_AT_STOP', 'ARRIVED_AT_FINAL_DESTINATION'].includes(trip.status)
    ) {
      await request<any>({
        method: 'POST',
        url: `/trips/${trip.tripId}/stops/${trip.currentDrop.stopId}/arrive`,
        data: devicePosition(),
      });
    }
    if (!serviceStarted) {
      await request<any>({
        method: 'POST',
        url: `/trips/${trip.tripId}/stops/${trip.currentDrop.stopId}/start-service`,
      });
    }
    const active = await jobsApi.getActiveJob();
    if (!active)
      throw new ApiError('Trip updated, but it could not be loaded. Refresh to retry.', 'unknown');
    return active;
  },

  verifyDrop: async (id: string, input: VerifyStopInput): Promise<DriverJob> => {
    const before = await jobsApi.getActiveJob().catch(() => null);
    const trip = await getActiveTripDetails();
    if (!trip?.tripId) throw new ApiError(TRIP_UNREACHABLE, 'unknown');
    const body = {
      otp: input.otp,
      recipient_name: 'Receiver',
      ...devicePosition(),
    };
    // Pay-at-drop: on the final stop the code only unlocks payment; recording the cash completes the
    // delivery. Stops before it (multi-stop) are simply completed with their own code.
    // The backend only gates payment this way for a single pickup + single drop; any multi-stop trip
    // completes every stop (the last one included) with /complete.
    const collectsAtDrop =
      trip.dropCount === 1 &&
      before?.payment.timing === 'on-delivery' &&
      before.payment.status === 'pending';
    const isMiddleStop = trip.currentDrop != null && !trip.currentDrop.isFinal;
    // Not swallowed: a wrong code must fail here, never count as delivered.
    if (isMiddleStop && trip.currentDrop) {
      await request<any>({
        method: 'POST',
        url: `/trips/${trip.tripId}/stops/${trip.currentDrop.stopId}/complete`,
        data: body,
      });
    } else if (collectsAtDrop && trip.currentDrop) {
      const verified = await request<any>({
        method: 'POST',
        url: `/trips/${trip.tripId}/stops/${trip.currentDrop.stopId}/verify-code`,
        data: body,
      });
      if (verified?.amount_to_collect != null) {
        amountToCollect.set(id, Number(verified.amount_to_collect));
      }
    } else {
      await request<any>({ method: 'POST', url: `/trips/${trip.tripId}/complete`, data: body });
    }
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
    if (!trip?.tripId) throw new ApiError(TRIP_UNREACHABLE, 'unknown');
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
    try {
      return await request<PaymentQr>({ method: 'POST', url: `/driver/jobs/${id}/payment/qr` });
    } catch {
      const job = await jobsApi.getActiveJob().catch(() => null);
      // The amount to collect, not the quoted fare: it includes any waiting charge.
      const amount = job?.payment.amount ?? job?.fare ?? 0;
      const ref = job?.number ?? id.slice(0, 8);
      const upiUri = `upi://pay?pa=ryno@icici&pn=Ryno%20Logistics&am=${amount.toFixed(2)}&cu=INR&tr=${encodeURIComponent(ref)}&tn=Order%20${encodeURIComponent(ref)}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      return {
        upiUri,
        payeeVpa: 'ryno@icici',
        payeeName: 'Ryno Logistics',
        amount,
        reference: ref,
        expiresAt,
      };
    }
  },

  /** Records cash received for a stop whose code is already verified. */
  collectCash: async (job: DriverJob): Promise<DriverJob> => {
    const tripId = (await getActiveTripDetails())?.tripId ?? lastTripId;
    if (!tripId) throw new ApiError(TRIP_UNREACHABLE, 'unknown');
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
    const res = await request<any>({ url: `/orders/${id}/chat/messages`, signal });
    const items = res?.items ?? (Array.isArray(res) ? res : []);
    return items.map((m: any) => ({
      id: m.id,
      orderId: id,
      // `is_mine` is from the viewer's side; this is the driver app.
      sender:
        m.is_mine === true ||
        m.sender_role === 'DRIVER' ||
        m.sender_type === 'DRIVER' ||
        m.sender === 'driver'
          ? 'driver'
          : 'customer',
      text: m.body ?? m.text ?? m.message ?? '',
      createdAt: m.created_at ?? m.createdAt ?? null,
      readAt: m.read_at ?? m.readAt ?? null,
    }));
  },

  sendMessage: async (id: string, text: string): Promise<ChatMessage> => {
    const res = await request<any>({
      method: 'POST',
      url: `/orders/${id}/chat/messages`,
      // The backend de-duplicates retries by this id, so a double tap never sends two messages.
      data: {
        body: text,
        client_message_id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
      },
    });
    return {
      id: res.id,
      orderId: id,
      sender: 'driver',
      text: res.body ?? text,
      createdAt: res.created_at ?? null,
      readAt: null,
    };
  },

  markMessagesRead: (id: string) => {
    return request<null>({ method: 'POST', url: `/orders/${id}/chat/read` });
  },
};
