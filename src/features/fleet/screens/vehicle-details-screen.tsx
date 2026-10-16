import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
} from '@/components/ui';

import { useFleetStore } from '../use-fleet-store';

export function VehicleDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const vehicles = useFleetStore.use.vehicles();
  const company = useFleetStore.use.company();
  const assignDriver = useFleetStore.use.assignDriver();
  const unassignDriver = useFleetStore.use.unassignDriver();
  const removeVehicle = useFleetStore.use.removeVehicle();

  const vehicleId = params.vehicleId || vehicles[0]?.id;
  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? vehicles[0];

  const [showDriverSheet, setShowDriverSheet] = useState(false);

  if (!vehicle) {
    return (
      <AppView className="flex-1 items-center justify-center bg-background p-6">
        <AppText className="text-[16px] text-muted">Vehicle not found</AppText>
        <Button label="Go back" className="mt-4" onPress={() => router.back()} />
      </AppView>
    );
  }

  const driver = vehicle.driver;

  const handleSelfAssign = () => {
    assignDriver(vehicle.id, {
      id: 'driver-owner',
      name: company.ownerName || 'Arun Kumar',
      phone: company.phone || '+91 98765 43210',
      dob: '12 / 05 / 1990',
      dlNumber: 'KA0320180012345',
      rating: 4.9,
      isOwnerSelf: true,
      aadhaarUploaded: true,
      dlUploaded: true,
    });
    setShowDriverSheet(false);
    Alert.alert('Driver updated', 'You (Owner) are now assigned as the driver for this vehicle.');
  };

  const handleUnassignDriver = () => {
    unassignDriver(vehicle.id);
    setShowDriverSheet(false);
    Alert.alert('Driver Unassigned', `${vehicle.model} is now unassigned.`);
  };

  const handleDeleteVehicle = () => {
    Alert.alert(
      'Remove Vehicle',
      `Are you sure you want to remove ${vehicle.model} (${vehicle.plateNumber}) from your fleet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeVehicle(vehicle.id);
            router.back();
          },
        },
      ],
    );
  };

  const handleAddNewDriver = () => {
    setShowDriverSheet(false);
    router.push({ pathname: '/add-driver' as any, params: { vehicleId: vehicle.id } });
  };

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <AppScrollView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        contentContainerClassName="px-5 pb-20 gap-5"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <AppView row className="items-center justify-between min-h-[44px]">
          <LiquidGlassBackButton onPress={() => router.back()} />
          <AppText className="text-[20px] font-black text-foreground">Vehicle Details</AppText>
          <AppView className="w-10" />
        </AppView>

        {/* Vehicle Card */}
        <AppView className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <AppView row className="items-center gap-4">
            <AppView className="h-20 w-24 items-center justify-center rounded-2xl bg-surface-muted overflow-hidden border border-border/40">
              <Image
                source={require('@/assets/images/vehicles/mini-truck.png')}
                style={{ width: '92%', height: '92%' }}
                resizeMode="contain"
              />
            </AppView>

            <AppView className="flex-1 justify-center">
              <AppView row className="items-center justify-between">
                <AppText className="text-[12px] font-semibold text-muted">
                  {vehicle.vehicleTypeName || 'Mini truck'}
                </AppText>
                <AppPressable
                  onPress={() => router.push('/setup-vehicle')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <AppText className="text-[13px] font-bold text-[#FF5722]">Edit</AppText>
                </AppPressable>
              </AppView>

              <AppText className="text-[18px] font-black text-foreground">{vehicle.model}</AppText>

              <AppText className="mt-0.5 text-[14px] font-semibold text-muted">
                {vehicle.plateNumber}
              </AppText>

              <AppView className="mt-2 self-start rounded-md bg-surface-muted px-2.5 py-0.5">
                <AppText className="text-[12px] font-bold text-foreground">
                  {vehicle.capacityKg} kg
                </AppText>
              </AppView>
            </AppView>
          </AppView>
        </AppView>

        {/* Documents Section */}
        <AppView className="gap-2.5">
          <AppText className="px-1 text-[18px] font-extrabold text-foreground">Documents</AppText>

          <AppView className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
            {/* Vehicle RC */}
            <AppView row className="items-center justify-between border-b border-border/60 p-4">
              <AppView row className="items-center gap-3">
                <AppView className="h-10 w-10 items-center justify-center rounded-xl bg-surface-muted">
                  <Icon name="doc.text.fill" size={18} tone="foreground" />
                </AppView>
                <AppText className="text-[15px] font-bold text-foreground">Vehicle RC</AppText>
              </AppView>
              <AppView className="rounded-full bg-emerald-500/15 px-3 py-1">
                <AppText className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                  {vehicle.documents?.rc?.label || 'Verified'}
                </AppText>
              </AppView>
            </AppView>

            {/* Insurance */}
            <AppView row className="items-center justify-between border-b border-border/60 p-4">
              <AppView row className="items-center gap-3">
                <AppView className="h-10 w-10 items-center justify-center rounded-xl bg-surface-muted">
                  <Icon name="shield.fill" size={18} tone="foreground" />
                </AppView>
                <AppText className="text-[15px] font-bold text-foreground">Insurance</AppText>
              </AppView>
              <AppView className="rounded-full bg-amber-500/15 px-3 py-1">
                <AppText className="text-[12px] font-bold text-amber-700 dark:text-amber-400">
                  {vehicle.documents?.insurance?.label || 'Expires in 28 days'}
                </AppText>
              </AppView>
            </AppView>

            {/* Pollution certificate */}
            <AppView row className="items-center justify-between p-4">
              <AppView row className="items-center gap-3">
                <AppView className="h-10 w-10 items-center justify-center rounded-xl bg-surface-muted">
                  <Icon name="leaf.fill" size={18} color="#10b981" />
                </AppView>
                <AppText className="text-[15px] font-bold text-foreground">
                  Pollution certificate
                </AppText>
              </AppView>
              <AppView className="rounded-full bg-emerald-500/15 px-3 py-1">
                <AppText className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                  {vehicle.documents?.pollution?.label || 'Verified'}
                </AppText>
              </AppView>
            </AppView>
          </AppView>
        </AppView>

        {/* Driver Section */}
        <AppView className="gap-2.5">
          <AppView row className="items-center justify-between px-1">
            <AppText className="text-[18px] font-extrabold text-foreground">Driver</AppText>
            <AppPressable
              onPress={() => setShowDriverSheet(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AppText className="text-[13px] font-bold text-[#FF5722]">Edit</AppText>
            </AppPressable>
          </AppView>

          <AppView className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <AppView row className="items-center gap-4">
              <AppView className="h-14 w-14 items-center justify-center rounded-full bg-[#FF5722]/10 border-2 border-[#FF5722]/30">
                <AppText className="text-[20px] font-black text-[#FF5722]">
                  {driver?.name ? driver.name.slice(0, 1).toUpperCase() : 'D'}
                </AppText>
              </AppView>

              <AppView className="flex-1">
                <AppView row className="items-center gap-2">
                  <AppText className="text-[17px] font-black text-foreground">
                    {driver?.name || 'Unassigned'}
                  </AppText>
                  {driver?.isOwnerSelf ? (
                    <AppView className="rounded-full bg-[#FF5722]/15 px-2 py-0.5">
                      <AppText className="text-[10px] font-extrabold text-[#FF5722]">
                        OWNER (YOU)
                      </AppText>
                    </AppView>
                  ) : null}
                </AppView>

                <AppView row className="mt-1 items-center gap-2">
                  <AppView
                    row
                    className="items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5"
                  >
                    <Icon name="star.fill" size={11} color="#f59e0b" />
                    <AppText className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                      {driver?.rating ? driver.rating.toFixed(1) : '4.9'}
                    </AppText>
                  </AppView>

                  <AppText className="text-[13px] font-medium text-muted">
                    {driver?.phone || '+91 98765 43210'}
                  </AppText>
                </AppView>
              </AppView>

              <AppPressable
                onPress={() => setShowDriverSheet(true)}
                className="h-9 w-9 items-center justify-center rounded-full bg-surface-muted"
              >
                <Icon name="chevron.right" size={16} tone="icon-subtle" />
              </AppPressable>
            </AppView>
          </AppView>
        </AppView>

        {/* Change driver modal/dialog */}
        {showDriverSheet ? (
          <AppView className="rounded-3xl border border-[#FF5722]/40 bg-card p-5 shadow-lg">
            <AppText className="text-[16px] font-extrabold text-foreground">
              Assign driver for {vehicle.model}
            </AppText>
            <AppText className="mt-1 text-[13px] text-muted">
              Choose who will drive this vehicle on delivery trips:
            </AppText>

            <AppView className="mt-4 gap-2.5">
              <AppPressable
                onPress={handleSelfAssign}
                className="flex-row items-center justify-between rounded-2xl border border-border bg-background p-3.5 active:bg-neutral-100 dark:active:bg-neutral-800"
              >
                <AppView row className="items-center gap-3">
                  <Icon name="steeringwheel" size={20} tone="brand" />
                  <AppView>
                    <AppText className="text-[14px] font-bold text-foreground">
                      Drive myself ({company.ownerName || 'Arun'})
                    </AppText>
                    <AppText className="text-[11px] text-muted">Owner self-drive mode</AppText>
                  </AppView>
                </AppView>
                {driver?.isOwnerSelf ? <Icon name="check" size={18} tone="brand" /> : null}
              </AppPressable>

              <AppPressable
                onPress={handleAddNewDriver}
                className="flex-row items-center justify-between rounded-2xl border border-border bg-background p-3.5 active:bg-neutral-100 dark:active:bg-neutral-800"
              >
                <AppView row className="items-center gap-3">
                  <Icon name="person.badge.plus" size={20} tone="foreground" />
                  <AppView>
                    <AppText className="text-[14px] font-bold text-foreground">
                      Add / Assign another driver
                    </AppText>
                    <AppText className="text-[11px] text-muted">
                      Enter full name, DL, and phone
                    </AppText>
                  </AppView>
                </AppView>
                <Icon name="chevron.right" size={16} tone="icon-subtle" />
              </AppPressable>

              {driver ? (
                <AppPressable
                  onPress={handleUnassignDriver}
                  className="flex-row items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/5 p-3.5 active:bg-red-500/10"
                >
                  <AppView row className="items-center gap-3">
                    <Icon name="xmark" size={20} tone="error" />
                    <AppView>
                      <AppText className="text-[14px] font-bold text-red-600 dark:text-red-400">
                        Unassign current driver
                      </AppText>
                      <AppText className="text-[11px] text-muted">
                        Vehicle will be marked unassigned
                      </AppText>
                    </AppView>
                  </AppView>
                </AppPressable>
              ) : null}
            </AppView>

            <Button
              variant="outline"
              label="Cancel"
              className="mt-4"
              onPress={() => setShowDriverSheet(false)}
            />
          </AppView>
        ) : null}

        {/* Remove vehicle button */}
        <AppView className="mt-4 pt-4 border-t border-border/60">
          <AppPressable
            onPress={handleDeleteVehicle}
            pressScale={0.98}
            className="flex-row items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 py-3.5 active:bg-red-500/20"
          >
            <Icon name="trash.fill" size={16} tone="error" />
            <AppText className="text-[14px] font-bold text-red-600 dark:text-red-400">
              Remove Vehicle from Fleet
            </AppText>
          </AppPressable>
        </AppView>
      </AppScrollView>
    </AppView>
  );
}
