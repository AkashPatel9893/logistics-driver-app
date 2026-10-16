import { Image } from 'react-native';

import { AppPressable, AppText, AppView } from '@/components/ui';

import type { FleetVehicle } from '../types';

export interface FleetVehicleCardProps {
  vehicle: FleetVehicle;
  onPress?: () => void;
  onEdit?: () => void;
  className?: string;
}

export function FleetVehicleCard({
  vehicle,
  onPress,
  onEdit,
  className = '',
}: FleetVehicleCardProps) {
  const driverName = vehicle.driver?.name || 'Unassigned';

  return (
    <AppPressable
      onPress={onPress ?? onEdit}
      pressScale={0.98}
      className={`rounded-[24px] border border-border/80 bg-card p-3.5 shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800 ${className}`}
    >
      <AppView row className="items-center gap-3">
        {/* Vehicle Thumbnail */}
        <AppView className="h-20 w-24 items-center justify-center rounded-2xl bg-surface-muted overflow-hidden border border-border/40">
          <Image
            source={require('@/assets/images/vehicles/mini-truck.png')}
            style={{ width: '92%', height: '92%' }}
            resizeMode="contain"
          />
        </AppView>

        {/* Vehicle Info */}
        <AppView className="flex-1 justify-center">
          <AppView row className="items-center justify-between">
            <AppText className="text-[12px] font-semibold text-muted">
              {vehicle.vehicleTypeName || 'Mini truck'}
            </AppText>
            <AppPressable
              onPress={onEdit ?? onPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AppText className="text-[13px] font-bold text-[#FF5722]">Edit</AppText>
            </AppPressable>
          </AppView>

          <AppText className="text-[16px] font-black text-foreground">{vehicle.model}</AppText>

          <AppText className="mt-0.5 text-[13px] font-bold text-foreground-secondary">
            Driver: {driverName}
            {vehicle.driver?.isOwnerSelf ? ' (You)' : ''}
          </AppText>

          <AppView row className="mt-1 items-center gap-2">
            <AppText className="text-[12px] font-medium text-muted">{vehicle.plateNumber}</AppText>
            <AppText className="text-[12px] text-muted">•</AppText>
            <AppView className="rounded-md bg-surface-muted px-2 py-0.5">
              <AppText className="text-[11px] font-bold text-foreground">
                {vehicle.capacityKg} kg
              </AppText>
            </AppView>
          </AppView>
        </AppView>
      </AppView>
    </AppPressable>
  );
}
