import type { ImageSourcePropType } from 'react-native';

/** Vehicle artwork by catalogue `imageKey` (same keys as the customer app). */
export const VEHICLE_IMAGES: Record<string, ImageSourcePropType> = {
  bike: require('@/assets/images/vehicles/bike.png'),
  'e-rikshaw': require('@/assets/images/vehicles/e-rikshaw.png'),
  'mini-truck': require('@/assets/images/vehicles/mini-truck.png'),
  'pickup-truck': require('@/assets/images/vehicles/pickup-truck.png'),
  'large-truck': require('@/assets/images/vehicles/large-truck.png'),
};
