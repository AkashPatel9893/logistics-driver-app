import { useLocationStore } from '@/stores/location-store';

import { request } from './client';

export interface Incident {
  id: string;
  number: string;
  type: string;
  status: string;
}

/** The latest GPS fix, or nothing: safety calls still go out without a position. */
function optionalPosition() {
  const fix = useLocationStore.getState().current;
  if (!fix) return {};
  return {
    latitude: fix.latitude,
    longitude: fix.longitude,
    ...(fix.speedKmph != null && fix.speedKmph >= 0 ? { speed_kph: fix.speedKmph } : {}),
  };
}

function mapIncident(raw: any): Incident {
  return { id: raw.id, number: raw.incident_number, type: raw.type, status: raw.status };
}

/** What a driver can report after the fact; emergencies go through SOS. */
export type IncidentType = 'ACCIDENT' | 'RUDE_BEHAVIOUR' | 'OTHER';

export const safetyApi = {
  /**
   * Raises an SOS on the current trip. Pressing it again while one is open returns the same
   * incident, so a retry is safe. Fails with code NO_ACTIVE_TRIP when there is no trip.
   */
  sos: async (): Promise<Incident> =>
    mapIncident(
      await request<any>({ method: 'POST', url: '/partner/safety/sos', data: optionalPosition() }),
    ),

  /**
   * Reports a problem on one of the driver's orders, in any state. Not for emergencies. Fails with
   * ORDER_NOT_FOUND (not their order), VALIDATION_ERROR or SAFETY_RATE_LIMITED.
   */
  reportIncident: async (input: {
    orderId: string;
    type: IncidentType;
    description: string;
  }): Promise<Incident> =>
    mapIncident(
      await request<any>({
        method: 'POST',
        url: '/partner/safety/incidents',
        data: {
          order_id: input.orderId,
          type: input.type,
          description: input.description,
          ...optionalPosition(),
        },
      }),
    ),
};
