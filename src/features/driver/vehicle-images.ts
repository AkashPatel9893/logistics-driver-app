import type { ImageSourcePropType } from 'react-native';

/** The only vehicle picture bundled with the app, used when the backend sends none. */
const FALLBACK_VEHICLE_IMAGE: ImageSourcePropType = require('@/assets/images/vehicles/mini-truck.png');

/** The backend's picture for a vehicle type, or the bundled fallback. */
export function getVehicleImage(imageUrl: string | null | undefined): ImageSourcePropType {
  return imageUrl ? { uri: imageUrl } : FALLBACK_VEHICLE_IMAGE;
}
