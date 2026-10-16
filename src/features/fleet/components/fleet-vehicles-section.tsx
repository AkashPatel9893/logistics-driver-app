import { useRouter } from 'expo-router';

import { AppPressable, AppText, AppView, Icon } from '@/components/ui';

import { useFleetStore } from '../use-fleet-store';
import { FleetVehicleCard } from './fleet-vehicle-card';

export interface FleetVehiclesSectionProps {
  className?: string;
  showAddButton?: boolean;
}

export function FleetVehiclesSection({
  className = '',
  showAddButton = true,
}: FleetVehiclesSectionProps) {
  const router = useRouter();
  const vehicles = useFleetStore.use.vehicles();
  const setSelectedVehicleId = useFleetStore.use.setSelectedVehicleId();

  const handleOpenVehicle = (id: string) => {
    setSelectedVehicleId(id);
    router.push({ pathname: '/vehicle-details' as any, params: { vehicleId: id } });
  };

  const handleAddVehicle = () => {
    router.push('/setup-vehicle');
  };

  return (
    <AppView className={`gap-3 ${className}`}>
      <AppView row className="items-center justify-between px-1">
        <AppText className="text-[18px] font-extrabold text-foreground">My Vehicles</AppText>
        {showAddButton ? (
          <AppPressable
            onPress={handleAddVehicle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="flex-row items-center gap-1"
          >
            <Icon name="plus" size={14} tone="brand" />
            <AppText className="text-[13px] font-bold text-[#FF5722]">Add vehicle</AppText>
          </AppPressable>
        ) : null}
      </AppView>

      <AppView className="gap-3">
        {vehicles.map((vehicle) => (
          <FleetVehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            onPress={() => handleOpenVehicle(vehicle.id)}
            onEdit={() => handleOpenVehicle(vehicle.id)}
          />
        ))}
      </AppView>
    </AppView>
  );
}
