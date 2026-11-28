import { AppPressable, AppText, AppView } from '@/components/ui';
import type { FleetMemberResponse } from '@/lib/api/fleet';

export interface FleetDriverPickerProps {
  drivers: FleetMemberResponse[];
  disabled: boolean;
  onPick: (driver: FleetMemberResponse) => void;
}

/** Drivers already in the fleet, to put on this vehicle with one tap. */
export function FleetDriverPicker({ drivers, disabled, onPick }: FleetDriverPickerProps) {
  if (drivers.length === 0) return null;

  return (
    <AppView className="mb-6 gap-2.5">
      <AppText className="text-[15px] font-bold text-foreground">Already in your fleet</AppText>
      {drivers.map((driver) => (
        <AppPressable
          key={driver.id}
          onPress={() => onPick(driver)}
          disabled={disabled}
          pressScale={0.98}
          accessibilityRole="button"
          className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-4"
        >
          <AppView className="flex-1">
            <AppText className="text-[14px] font-bold text-foreground">{driver.name}</AppText>
            <AppText className="text-[12px] text-muted">
              {driver.vehicle ? `On ${driver.vehicle.registration_number}` : 'No vehicle'}
            </AppText>
          </AppView>
          <AppText className="text-[13px] font-bold text-brand">Assign</AppText>
        </AppPressable>
      ))}
      <AppText className="mt-2 text-[15px] font-bold text-foreground">Or add someone new</AppText>
    </AppView>
  );
}
