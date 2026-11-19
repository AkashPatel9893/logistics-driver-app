import type { ImageSourcePropType } from 'react-native';

/** Pictures bundled with the app, used when the backend sends none or its link fails. */
const BUNDLED = {
  scooter: require('@/assets/images/vehicles/scooter.png'),
  threeWheeler: require('@/assets/images/vehicles/three-wheeler.png'),
  miniTruck: require('@/assets/images/vehicles/mini-truck.png'),
  pickup: require('@/assets/images/vehicles/pickup.png'),
  heavyTruck: require('@/assets/images/vehicles/heavy-truck.png'),
} satisfies Record<string, ImageSourcePropType>;

/**
 * Bundled picture for a vehicle type, matched on its code or name
 * (e.g. BIKE, "2 Wheeler", THREE_WHEELER, TATA_ACE, PICKUP_8FT, TRUCK_14FT).
 */
export function getBundledVehicleImage(codeOrName?: string | null): ImageSourcePropType {
  const key = (codeOrName ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  if (/BIKE|SCOOTER|TWO_WHEELER|(^|_)2_?W/.test(key)) return BUNDLED.scooter;
  if (/THREE_WHEELER|(^|_)3_?W|AUTO|E_LOADER/.test(key)) return BUNDLED.threeWheeler;
  if (/PICKUP/.test(key)) return BUNDLED.pickup;
  if (/HEAVY|TRUCK_(1[0-9]|[2-9][0-9])|(1[0-9]|[2-9][0-9])_?FT|EICHER|407|LCV|HCV/.test(key)) {
    return BUNDLED.heavyTruck;
  }
  return BUNDLED.miniTruck;
}

/** The backend's picture for a vehicle type, or the bundled one for that type. */
export function getVehicleImage(
  imageUrl: string | null | undefined,
  codeOrName?: string | null,
): ImageSourcePropType {
  return imageUrl ? { uri: imageUrl } : getBundledVehicleImage(codeOrName);
}
