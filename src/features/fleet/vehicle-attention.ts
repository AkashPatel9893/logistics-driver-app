import type { FleetVehicle } from './types';
import { FLEET_VEHICLE_DOCUMENTS_ENABLED } from './config';

export interface VehicleAttention {
  text: string;
  /** `action`: the owner has to do something; `wait`: Ryno or the driver has to. */
  tone: 'action' | 'wait';
}

const PAPERS = [
  { key: 'rc', name: 'RC' },
  { key: 'insurance', name: 'insurance' },
  { key: 'pollution', name: 'pollution certificate' },
] as const;

const list = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

/**
 * The one thing about this vehicle that needs the owner's eye, or null when it is ready and has a
 * working driver. Built from the fleet vehicle list only (paper labels come from the backend:
 * "Not uploaded", "Expired", "Rejected", "Pending verification", "Verified").
 */
function paperState(vehicle: FleetVehicle) {
  // An electric vehicle needs no pollution certificate.
  const papers = PAPERS.filter((p) => p.key !== 'pollution' || vehicle.fuelType !== 'ELECTRIC');
  const label = (key: (typeof PAPERS)[number]['key']) => vehicle.documents[key]?.label ?? '';
  return {
    papers,
    label,
    missing: papers.filter((p) => ['Not uploaded', '—', ''].includes(label(p.key))),
    refused: papers.filter((p) => ['Expired', 'Rejected'].includes(label(p.key))),
  };
}

/** The "Verify this vehicle first" card on Vehicle details: what is left before a driver can drive. */
export function verifyFirstMessage(vehicle: FleetVehicle): { title: string; body: string } {
  const { papers, missing, refused } = paperState(vehicle);
  const toUpload = [...refused, ...missing];
  if (toUpload.length > 0) {
    return {
      title: 'Verify this vehicle first',
      body: `Upload the ${list(toUpload.map((p) => p.name))}. Once Ryno verifies them, you can add a driver or drive it yourself.`,
    };
  }
  const waiting = papers.filter((p) => vehicle.documents[p.key]?.verified !== true);
  const names = waiting.length > 0 ? list(waiting.map((p) => p.name)) : 'papers';
  return {
    title: 'Waiting for Ryno',
    body: `Ryno is checking the ${names}, usually within a day. Then you can add a driver or drive it yourself.`,
  };
}

export function vehicleAttention(vehicle: FleetVehicle): VehicleAttention | null {
  if (FLEET_VEHICLE_DOCUMENTS_ENABLED) {
    const { papers, label, missing, refused } = paperState(vehicle);
    if (refused.length > 0) {
      return { text: `Upload the ${list(refused.map((p) => p.name))} again`, tone: 'action' };
    }
    if (missing.length > 0) {
      return { text: `Upload the ${list(missing.map((p) => p.name))}`, tone: 'action' };
    }
    if (papers.some((p) => label(p.key) === 'Pending verification')) {
      return { text: 'Papers waiting for Ryno to check', tone: 'wait' };
    }
    const expiring = papers.filter((p) => vehicle.documents[p.key]?.isExpiringSoon);
    if (expiring.length > 0) {
      return { text: `${list(expiring.map((p) => p.name))} expires soon`, tone: 'action' };
    }
  }
  const driver = vehicle.driver;
  if (!driver) return { text: 'No driver yet', tone: 'action' };
  if (driver.isInvited) return { text: `${driver.name} has not joined yet`, tone: 'wait' };
  if (driver.assignmentStatus === 'PENDING') {
    return { text: `${driver.name}: waiting for Ryno approval`, tone: 'wait' };
  }
  return null;
}
