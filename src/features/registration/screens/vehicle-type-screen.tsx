import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AppPressable, AppScrollView, AppSpinner, AppText, AppView, Icon } from '@/components/ui';
import { SetupScreenLayout } from '@/features/driver/components/setup-screen-layout';
import { VehicleImage } from '@/features/driver/components/vehicle-image';
import { useDriverProfile, useVehicleTypes } from '@/hooks/use-driver';

import { StickyFooter } from '../components';
import { useRegistrationStore } from '../use-registration-store';
import { goToNextStep } from '../next-step';

export interface VehicleTypeScreenProps {
  /** Shown during sign-up (before a profile exists): Confirm continues to Driver details. */
  signUp?: boolean;
}

/** Which vehicle the driver will deliver with. Right after "Rider" at sign-up, or from Documents. */
export function VehicleTypeScreen({ signUp = false }: VehicleTypeScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profile } = useDriverProfile({ enabled: !signUp });
  const { data: vehicleTypes = [], isLoading } = useVehicleTypes();
  const savedId = useRegistrationStore.use.vehicleTypeId();
  const setVehicleTypeId = useRegistrationStore.use.setVehicleTypeId();
  const registered = profile?.vehicle ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(registered?.vehicleTypeId || savedId);

  const handleConfirm = () => {
    if (!selectedId) return;
    setVehicleTypeId(selectedId);
    if (signUp) router.push('/(auth)/onboarding');
    else goToNextStep(router, queryClient, 'vehicle-type');
  };

  return (
    <SetupScreenLayout title="Select vehicle" subtitle="Which vehicle will you drive?">
      <AppScrollView
        contentContainerClassName="gap-3 px-5 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {registered ? (
          <AppView className="rounded-2xl bg-amber-500/10 px-4 py-3">
            <AppText className="text-[13px] font-semibold text-amber-700 dark:text-amber-400">
              {`${registered.vehicleTypeName} (${registered.plateNumber}) is already registered. To change it, contact support.`}
            </AppText>
          </AppView>
        ) : null}

        {isLoading ? <AppSpinner className="mt-10" /> : null}

        {vehicleTypes.map((type) => {
          const selected = type.id === selectedId;
          return (
            <AppPressable
              key={type.id}
              disabled={Boolean(registered)}
              onPress={() => setSelectedId(type.id)}
              pressScale={0.98}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              className={`flex-row items-center gap-4 rounded-2xl border-2 p-3 ${
                selected ? 'border-brand bg-brand-soft' : 'border-border/80 bg-surface'
              }`}
            >
              <AppView className="h-16 w-20 items-center justify-center overflow-hidden rounded-xl bg-surface-muted">
                <VehicleImage
                  imageUrl={type.imageUrl}
                  type={type.code || type.name}
                  className="h-full w-full"
                />
              </AppView>
              <AppView className="flex-1">
                <AppText className="text-[16px] font-bold text-foreground">{type.name}</AppText>
                {type.capacityKg ? (
                  <AppText className="mt-0.5 text-[12px] text-muted">
                    Carries up to {Number(type.capacityKg)} kg
                  </AppText>
                ) : null}
              </AppView>
              <AppView
                className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
                  selected ? 'border-brand bg-brand' : 'border-border'
                }`}
              >
                {selected ? <Icon name="checkmark" size={13} tone="brand-foreground" /> : null}
              </AppView>
            </AppPressable>
          );
        })}
      </AppScrollView>
      {registered ? null : (
        <StickyFooter label="Confirm vehicle" onPress={handleConfirm} disabled={!selectedId} />
      )}
    </SetupScreenLayout>
  );
}
