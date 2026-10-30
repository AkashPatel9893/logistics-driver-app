import { useRouter } from 'expo-router';

import { AppPressable, AppSpinner, AppText, AppView, Icon } from '@/components/ui';
import { useFleetVehicles } from '@/hooks/use-fleet';

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
  const { data: vehicles = [], isLoading } = useFleetVehicles();
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

      {isLoading ? (
        <AppView className="items-center justify-center p-8">
          <AppSpinner size="small" />
        </AppView>
      ) : vehicles.length === 0 ? (
        <AppView className="items-center justify-center rounded-[24px] border border-dashed border-border bg-card p-6">
          <Icon name="box.truck.fill" size={32} tone="icon-subtle" />
          <AppText className="mt-2 text-[15px] font-bold text-foreground">
            No vehicles in fleet yet
          </AppText>
          <AppText className="mt-1 text-center text-[12px] text-muted">
            Add your first vehicle and assign drivers or drive yourself.
          </AppText>
          <AppPressable
            onPress={handleAddVehicle}
            className="mt-3.5 rounded-full bg-[#FF5722] px-4 py-2"
          >
            <AppText className="text-[12px] font-bold text-white">Add your first vehicle</AppText>
          </AppPressable>
        </AppView>
      ) : (
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
      )}
    </AppView>
  );
}
