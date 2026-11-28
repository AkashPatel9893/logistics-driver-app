import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppPressable,
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
} from '@/components/ui';
import { VehicleImage } from '@/features/driver/components/vehicle-image';
import { VehicleDocumentSheet, type VehicleDocumentType } from '@/features/fleet/components';
import {
  useAssignFleetDriver,
  useFleetCompany,
  useFleetVehicles,
  useRemoveFleetDriver,
  useRemoveFleetVehicle,
  useFleetVehicleDocuments,
  useSubmitFleetVehicleDocument,
  useUnassignFleetDriver,
} from '@/hooks/use-fleet';
import { useVehicleTypes } from '@/hooks/use-driver';
import { OtherVehiclePapers } from '@/features/driver/components/other-vehicle-papers';
import type { VehicleDocumentSubmission } from '@/features/fleet/components/vehicle-document-sheet';
import { getErrorMessage } from '@/lib/api/api-error';
import { goBack } from '@/lib/go-back';

import { FLEET_VEHICLE_DOCUMENTS_ENABLED } from '../config';
import { DriverOptionsSheet, type DriverOption } from '../components/driver-options-sheet';
import { EditFleetVehicleSheet } from '../components/edit-fleet-vehicle-sheet';
import { vehicleDetailsEditable, vehicleDocumentsReady } from '../types';

const DOCUMENT_ROWS = [
  { type: 'RC', key: 'rc', label: 'Vehicle RC', icon: 'doc.text.fill' },
  { type: 'INSURANCE', key: 'insurance', label: 'Insurance', icon: 'shield.fill' },
  { type: 'PUC', key: 'pollution', label: 'Pollution certificate', icon: 'leaf.fill' },
] as const;

export function VehicleDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // edit=1: opened from the vehicle card's Edit, so the edit sheet opens at once.
  const params = useLocalSearchParams<{ vehicleId?: string; edit?: string }>();

  const { data: vehicles, isLoading } = useFleetVehicles();
  const { data: company } = useFleetCompany();
  const assignDriverMutation = useAssignFleetDriver();
  const unassignDriverMutation = useUnassignFleetDriver();
  const removeVehicleMutation = useRemoveFleetVehicle();
  const removeDriverMutation = useRemoveFleetDriver();
  const submitDocument = useSubmitFleetVehicleDocument();
  const [documentToUpload, setDocumentToUpload] = useState<VehicleDocumentType | null>(null);

  const vehicleId = params.vehicleId || vehicles?.[0]?.id;
  const vehicle = vehicles?.find((v) => v.id === vehicleId) ?? vehicles?.[0];
  const { data: papers = [] } = useFleetVehicleDocuments(vehicle?.id);
  const { data: vehicleTypes = [] } = useVehicleTypes();
  const vehicleType = vehicleTypes.find((t) => t.code === vehicle?.vehicleTypeCode);

  const [showDriverSheet, setShowDriverSheet] = useState(false);
  const [editOpen, setEditOpen] = useState(params.edit === '1');

  if (isLoading) {
    return (
      <AppView className="flex-1 items-center justify-center bg-background p-6">
        <AppSpinner size="large" />
      </AppView>
    );
  }

  if (!vehicle) {
    return (
      <AppView className="flex-1 items-center justify-center bg-background p-6">
        <AppText className="text-[16px] text-muted">Vehicle not found</AppText>
        <Button label="Go back" className="mt-4" onPress={() => goBack(router)} />
      </AppView>
    );
  }

  const driver = vehicle.driver;
  const documentsReady = vehicleDocumentsReady(vehicle);

  const handleSubmitDocument = async (submission: {
    type: VehicleDocumentType;
    photoUri: string;
    expiryDate?: string;
  }) => {
    try {
      await submitDocument.mutateAsync({
        vehicleId: vehicle.id,
        input: {
          type: submission.type,
          fileUri: submission.photoUri,
          expiryDate: submission.expiryDate,
          ...(submission.type === 'RC' ? { identifier: vehicle.plateNumber } : {}),
        },
      });
      setDocumentToUpload(null);
      Alert.alert('Sent for verification', 'We will let you know once an admin has verified it.');
    } catch (err) {
      Alert.alert('Could not send the document', getErrorMessage(err));
    }
  };

  // Fitness and permits: sent the same way; the papers card closes its sheet on success.
  const handleSubmitOtherPaper = async (submission: VehicleDocumentSubmission) => {
    try {
      await submitDocument.mutateAsync({
        vehicleId: vehicle.id,
        input: {
          type: submission.type,
          fileUri: submission.photoUri,
          expiryDate: submission.expiryDate,
        },
      });
      Alert.alert('Sent for verification', 'We will let you know once an admin has verified it.');
      return true;
    } catch (err) {
      Alert.alert('Could not send the document', getErrorMessage(err));
      return false;
    }
  };

  const run = async (action: () => Promise<unknown>, failure: string, done?: string) => {
    try {
      await action();
      if (done) Alert.alert(done);
    } catch (err) {
      Alert.alert(failure, getErrorMessage(err));
    }
  };

  /** Closes the sheet, asks first, then runs: every one of these takes a driver off the vehicle. */
  const confirm = (
    title: string,
    message: string,
    label: string,
    action: () => void,
    keep = 'Cancel',
  ) => {
    setShowDriverSheet(false);
    Alert.alert(title, message, [
      { text: keep, style: 'cancel' },
      { text: label, style: 'destructive', onPress: action },
    ]);
  };

  const assignSelf = () =>
    run(
      () =>
        assignDriverMutation.mutateAsync({
          vehicleId: vehicle.id,
          body: { is_owner_self: true },
        }),
      'Could not assign you',
      'You now drive this vehicle',
    );

  const handleSelfAssign = () => {
    setShowDriverSheet(false);
    const drivenByMe = vehicles?.find((v) => v.id !== vehicle.id && v.driver?.isOwnerSelf);
    const leaving = [
      driver ? `${driver.name} will no longer be on this vehicle.` : null,
      drivenByMe ? `You will stop driving ${drivenByMe.plateNumber}.` : null,
    ].filter(Boolean);
    if (leaving.length === 0) {
      void assignSelf();
      return;
    }
    Alert.alert('Drive this vehicle yourself?', leaving.join(' '), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Drive it', onPress: () => void assignSelf() },
    ]);
  };

  const unassign = (title: string, message: string, label: string) =>
    confirm(title, message, label, () => {
      void run(() => unassignDriverMutation.mutateAsync(vehicle.id), 'Could not unassign');
    });

  const removeDriver = (id: string, title: string, message: string, label: string, keep?: string) =>
    confirm(
      title,
      message,
      label,
      () => {
        void run(() => removeDriverMutation.mutateAsync(id), 'Could not remove the driver');
      },
      keep,
    );

  const handleDeleteVehicle = () => {
    Alert.alert(
      'Remove Vehicle',
      `Remove ${vehicle.model} (${vehicle.plateNumber}) from your fleet?${
        driver ? ` ${driver.isOwnerSelf ? 'You' : driver.name} will no longer be on it.` : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeVehicleMutation.mutateAsync(vehicle.id);
              goBack(router);
            } catch (err) {
              Alert.alert('Could not remove the vehicle', getErrorMessage(err));
            }
          },
        },
      ],
    );
  };

  const handleAddNewDriver = () => {
    setShowDriverSheet(false);
    router.push({ pathname: '/add-driver' as any, params: { vehicleId: vehicle.id } });
  };

  const driverOptions: DriverOption[] = [];
  if (!driver?.isOwnerSelf) {
    driverOptions.push({
      key: 'self',
      icon: 'steeringwheel',
      title: `Drive myself${company?.ownerName ? ` (${company.ownerName})` : ''}`,
      detail: 'You drive one vehicle at a time',
      onPress: handleSelfAssign,
    });
  }
  driverOptions.push({
    key: 'new',
    icon: 'person.badge.plus',
    title: driver ? 'Assign a different driver' : 'Add a driver',
    detail: 'By name and mobile number',
    onPress: handleAddNewDriver,
  });
  if (driver?.isInvited && driver.inviteId) {
    const inviteId = driver.inviteId;
    driverOptions.push({
      key: 'cancel-invite',
      icon: 'xmark',
      danger: true,
      title: 'Cancel invite',
      detail: 'They will not join your fleet',
      onPress: () =>
        removeDriver(
          inviteId,
          'Cancel this invite?',
          `${driver.name} will not join your fleet.`,
          'Cancel invite',
          'Keep invite',
        ),
    });
  } else if (driver?.isOwnerSelf) {
    driverOptions.push({
      key: 'stop',
      icon: 'xmark',
      danger: true,
      title: 'Stop driving this vehicle',
      detail: 'The vehicle will have no driver',
      onPress: () => unassign('Stop driving?', 'This vehicle will have no driver.', 'Stop driving'),
    });
  } else if (driver) {
    driverOptions.push(
      {
        key: 'unassign',
        icon: 'xmark',
        danger: true,
        title: 'Unassign from this vehicle',
        detail: 'They stay in your fleet',
        onPress: () =>
          unassign('Unassign driver?', `${driver.name} stays in your fleet.`, 'Unassign'),
      },
      {
        key: 'remove',
        icon: 'trash.fill',
        danger: true,
        title: 'Remove from fleet',
        detail: 'Takes them off your fleet and its vehicles',
        onPress: () =>
          removeDriver(
            driver.id,
            'Remove from fleet?',
            `${driver.name} will leave your fleet.`,
            'Remove',
          ),
      },
    );
  }

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
          <LiquidGlassBackButton onPress={() => goBack(router)} />
          <AppText className="text-[20px] font-black text-foreground">Vehicle Details</AppText>
          <AppView className="w-10" />
        </AppView>

        {/* Vehicle Card */}
        <AppView className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <AppView row className="items-center gap-4">
            <AppView className="h-20 w-24 items-center justify-center rounded-2xl bg-surface-muted overflow-hidden border border-border/40">
              <VehicleImage
                imageUrl={null}
                type={vehicle.vehicleTypeCode}
                className="h-full w-full"
              />
            </AppView>

            <AppView className="flex-1 justify-center">
              <AppView row className="items-center justify-between">
                <AppText className="text-[12px] font-semibold text-muted">
                  {vehicle.vehicleTypeName || 'Mini truck'}
                </AppText>
                {vehicleDetailsEditable(vehicle) ? (
                  <AppPressable
                    onPress={() => setEditOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Edit vehicle"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <AppText className="text-[13px] font-bold text-[#FF5722]">Edit</AppText>
                  </AppPressable>
                ) : null}
              </AppView>

              <AppText className="text-[18px] font-black text-foreground">
                {[vehicle.make, vehicle.model].filter(Boolean).join(' ')}
              </AppText>

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
            {DOCUMENT_ROWS.map((row, index) => {
              const state = vehicle.documents?.[row.key];
              const verified = state?.verified === true;
              const hidden = row.type === 'PUC' && vehicle.fuelType === 'ELECTRIC';
              if (hidden) return null;
              return (
                <AppView
                  key={row.type}
                  row
                  className={`items-center justify-between p-4 ${
                    index < DOCUMENT_ROWS.length - 1 ? 'border-b border-border/60' : ''
                  }`}
                >
                  <AppView row className="flex-1 items-center gap-3">
                    <AppView className="h-10 w-10 items-center justify-center rounded-xl bg-surface-muted">
                      <Icon name={row.icon} size={18} tone="foreground" />
                    </AppView>
                    <AppText className="flex-1 text-[15px] font-bold text-foreground">
                      {row.label}
                    </AppText>
                  </AppView>
                  <AppView className="items-end gap-1.5">
                    <AppView
                      className={`rounded-full px-3 py-1 ${
                        verified ? 'bg-emerald-500/15' : 'bg-amber-500/15'
                      }`}
                    >
                      <AppText
                        className={`text-[12px] font-bold ${
                          verified
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {state?.label || '—'}
                      </AppText>
                    </AppView>
                    {FLEET_VEHICLE_DOCUMENTS_ENABLED && !verified ? (
                      <AppPressable
                        onPress={() => setDocumentToUpload(row.type)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <AppText className="text-[13px] font-bold text-[#FF5722]">
                          {state?.label && state.label !== 'Not uploaded'
                            ? 'Upload again'
                            : 'Upload'}
                        </AppText>
                      </AppPressable>
                    ) : null}
                  </AppView>
                </AppView>
              );
            })}
          </AppView>
        </AppView>

        <OtherVehiclePapers
          needFitness={vehicleType?.requiresFitness === true}
          needPermit={vehicleType?.requiresPermit === true}
          papers={papers}
          submitting={submitDocument.isPending}
          note="An admin checks it, usually within a day. Your driver can go online once every paper is verified."
          onSubmit={handleSubmitOtherPaper}
        />

        {/* Driver Section */}
        <AppView className="gap-2.5">
          <AppView row className="items-center justify-between px-1">
            <AppText className="text-[18px] font-extrabold text-foreground">Driver</AppText>
            {driver ? (
              <AppPressable
                onPress={() => setShowDriverSheet(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AppText className="text-[13px] font-bold text-[#FF5722]">Change</AppText>
              </AppPressable>
            ) : null}
          </AppView>

          {!driver && !documentsReady ? (
            <AppView className="rounded-3xl border border-dashed border-border bg-card p-5 shadow-sm">
              <AppView row className="items-center gap-4">
                <AppView className="h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
                  <Icon name="lock.fill" size={22} tone="icon-subtle" />
                </AppView>
                <AppView className="flex-1">
                  <AppText className="text-[17px] font-black text-foreground">
                    Verify this vehicle first
                  </AppText>
                  <AppText className="mt-0.5 text-[13px] text-muted">
                    Upload and get its RC, insurance and pollution certificate verified. Then you
                    can add a driver or drive it yourself.
                  </AppText>
                </AppView>
              </AppView>
            </AppView>
          ) : null}

          {!driver && documentsReady ? (
            <AppView className="rounded-3xl border border-dashed border-[#FF5722]/50 bg-card p-5 shadow-sm">
              <AppView row className="items-center gap-4">
                <AppView className="h-14 w-14 items-center justify-center rounded-full bg-[#FF5722]/10">
                  <Icon name="person.badge.plus" size={24} tone="brand" />
                </AppView>
                <AppView className="flex-1">
                  <AppText className="text-[17px] font-black text-foreground">
                    No driver yet
                  </AppText>
                  <AppText className="mt-0.5 text-[13px] text-muted">
                    Add a driver, or drive this vehicle yourself.
                  </AppText>
                </AppView>
              </AppView>
              <Button
                variant="brand"
                label="Add driver"
                className="mt-4"
                onPress={() => setShowDriverSheet(true)}
              />
            </AppView>
          ) : driver ? (
            <AppView className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <AppView row className="items-center gap-4">
                <AppView className="h-14 w-14 items-center justify-center rounded-full bg-[#FF5722]/10 border-2 border-[#FF5722]/30">
                  <AppText className="text-[20px] font-black text-[#FF5722]">
                    {driver?.name ? driver.name.slice(0, 1).toUpperCase() : 'D'}
                  </AppText>
                </AppView>

                <AppView className="flex-1">
                  <AppView row className="flex-wrap items-center gap-2">
                    <AppText className="text-[17px] font-black text-foreground">
                      {driver?.name}
                    </AppText>
                    {driver?.isInvited ? (
                      <AppView className="rounded-full bg-amber-500/15 px-2 py-0.5">
                        <AppText className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400">
                          INVITED · NOT JOINED
                        </AppText>
                      </AppView>
                    ) : null}
                    {driver?.isOwnerSelf ? (
                      <AppView className="rounded-full bg-[#FF5722]/15 px-2 py-0.5">
                        <AppText className="text-[10px] font-extrabold text-[#FF5722]">
                          OWNER (YOU)
                        </AppText>
                      </AppView>
                    ) : null}
                  </AppView>

                  <AppView row className="mt-1 items-center gap-2">
                    {driver?.rating != null ? (
                      <AppView
                        row
                        className="items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5"
                      >
                        <Icon name="star.fill" size={11} color="#f59e0b" />
                        <AppText className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                          {Number(driver.rating).toFixed(1)}
                        </AppText>
                      </AppView>
                    ) : null}

                    {driver?.phone ? (
                      <AppText className="text-[13px] font-medium text-muted">
                        {driver.phone}
                      </AppText>
                    ) : null}
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
          ) : null}
        </AppView>

        {documentToUpload ? (
          <VehicleDocumentSheet
            key={documentToUpload}
            visible
            type={documentToUpload}
            title={DOCUMENT_ROWS.find((row) => row.type === documentToUpload)?.label ?? 'Document'}
            submitting={submitDocument.isPending}
            onSubmit={handleSubmitDocument}
            onClose={() => setDocumentToUpload(null)}
          />
        ) : null}

        {editOpen && vehicleDetailsEditable(vehicle) ? (
          <EditFleetVehicleSheet
            visible
            vehicle={vehicle}
            onClose={() => setEditOpen(false)}
            onSaved={() => {
              setEditOpen(false);
              Alert.alert('Vehicle updated');
            }}
          />
        ) : null}
        <DriverOptionsSheet
          visible={showDriverSheet}
          title={`${driver ? 'Driver of' : 'Add a driver to'} ${vehicle.plateNumber}`}
          options={driverOptions}
          busy={assignDriverMutation.isPending}
          onClose={() => setShowDriverSheet(false)}
        />

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
