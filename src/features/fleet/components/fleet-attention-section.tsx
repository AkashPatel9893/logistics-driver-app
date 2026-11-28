import { useRouter } from 'expo-router';

import { AppPressable, AppText, AppView, Icon } from '@/components/ui';

import type { FleetVehicle } from '../types';
import { useFleetStore } from '../use-fleet-store';
import { vehicleAttention } from '../vehicle-attention';

/**
 * Owner Home: only the vehicles that need something (papers, a driver, an invite not accepted).
 * The full list stays behind the Vehicles tile, so nothing is shown twice.
 */
export function FleetAttentionSection({ vehicles }: { vehicles: FleetVehicle[] }) {
  const router = useRouter();
  const setSelectedVehicleId = useFleetStore.use.setSelectedVehicleId();
  const rows = vehicles
    .map((vehicle) => ({ vehicle, attention: vehicleAttention(vehicle) }))
    .filter((row) => row.attention !== null)
    // What the owner must do comes before what they wait for.
    .sort((a, b) => Number(a.attention?.tone === 'wait') - Number(b.attention?.tone === 'wait'));
  if (rows.length === 0) return null;

  const open = (id: string) => {
    setSelectedVehicleId(id);
    router.push({ pathname: '/vehicle-details' as any, params: { vehicleId: id } });
  };

  return (
    <AppView className="gap-2.5">
      <AppText className="px-1 text-[18px] font-extrabold text-foreground">
        Needs your attention
      </AppText>
      {rows.map(({ vehicle, attention }) => (
        <AppPressable
          key={vehicle.id}
          onPress={() => open(vehicle.id)}
          pressScale={0.98}
          accessibilityRole="button"
          className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <Icon
            name={attention?.tone === 'action' ? 'exclamationmark.triangle.fill' : 'info.circle'}
            size={20}
            tone={attention?.tone === 'action' ? 'brand' : 'icon-subtle'}
          />
          <AppView className="flex-1">
            <AppText className="text-[14px] font-bold text-foreground">
              {vehicle.plateNumber}
              <AppText className="text-[13px] font-normal text-muted">
                {` · ${vehicle.make} ${vehicle.model}`}
              </AppText>
            </AppText>
            <AppText className="mt-0.5 text-[13px] text-muted">{attention?.text}</AppText>
          </AppView>
          <Icon name="chevron.right" size={16} tone="icon-subtle" />
        </AppPressable>
      ))}
    </AppView>
  );
}
