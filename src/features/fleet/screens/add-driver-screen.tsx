import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppKeyboardAvoidingView,
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
  TextField,
} from '@/components/ui';
import {
  useAssignFleetDriver,
  useFleetCompany,
  useFleetDrivers,
  useFleetVehicles,
} from '@/hooks/use-fleet';
import type { AssignDriverRequest } from '@/lib/api/fleet';
import { getErrorMessage, toApiError } from '@/lib/api/api-error';
import { goBack } from '@/lib/go-back';

import { FleetDriverPicker } from '../components/fleet-driver-picker';
import { joinedDrivers, lastTenDigits } from '../fleet-members';

export function AddDriverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const vehicleId = params.vehicleId;

  const { data: company } = useFleetCompany();
  const { data: vehicles } = useFleetVehicles();
  const assignDriverMutation = useAssignFleetDriver();
  const { data: members = [] } = useFleetDrivers();

  const [isSelfDrive, setIsSelfDrive] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const handleToggleSelfDrive = () => {
    if (!isSelfDrive) {
      setIsSelfDrive(true);
      setFullName(company?.ownerName || '');
      setPhone(
        company?.phone ? company.phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10) : '',
      );
    } else {
      setIsSelfDrive(false);
      setFullName('');
      setPhone('');
    }
  };

  // Only who the driver is: they add licence, date of birth and Aadhaar in their own onboarding.
  const isValid = isSelfDrive ? true : fullName.trim().length >= 2 && phone.trim().length >= 10;

  const handleContinue = async () => {
    const targetVehicleId = vehicleId || vehicles?.[0]?.id;
    if (!targetVehicleId) {
      Alert.alert('No vehicle available', 'Please add a vehicle to your fleet first.');
      return;
    }

    if (!isValid) {
      Alert.alert('Incomplete details', "Enter the driver's name and 10-digit mobile number.");
      return;
    }

    // Someone who already joined is assigned by id: the backend refuses their name and number.
    const member = isSelfDrive
      ? undefined
      : joinedDrivers(members).find((m) => lastTenDigits(m.phone) === lastTenDigits(phone));
    await assignDriver(
      targetVehicleId,
      isSelfDrive
        ? { is_owner_self: true }
        : member
          ? { driver_id: member.id }
          : {
              is_owner_self: false,
              name: fullName.trim(),
              phone: `+91 ${phone.trim().slice(-10)}`,
            },
      member?.name ?? fullName.trim(),
      member?.phone ?? phone,
    );
  };

  const assignDriver = async (
    targetVehicleId: string,
    body: AssignDriverRequest,
    driverName: string,
    driverPhone: string,
  ) => {
    const send = async () => {
      try {
        const vehicle = await assignDriverMutation.mutateAsync({
          vehicleId: targetVehicleId,
          body,
        });
        const invited = Boolean(vehicle.driver?.invite_id);
        Alert.alert(
          invited ? 'Driver invited' : 'Driver assigned',
          body.is_owner_self
            ? 'You now drive this vehicle.'
            : invited
              ? `${driverName} is invited. They join when they sign in to Ryno Partner with this number.`
              : `${driverName} now drives this vehicle.`,
          [{ text: 'Continue', onPress: () => goBack(router) }],
        );
      } catch (err) {
        // A number with its own Ryno account joins by asking from their app; the owner approves.
        const alreadyRegistered = toApiError(err).code === 'DRIVER_ALREADY_REGISTERED';
        Alert.alert(
          'Could not add the driver',
          getErrorMessage(err),
          alreadyRegistered
            ? [
                { text: 'Close', style: 'cancel' },
                { text: 'See requests', onPress: () => router.push('/fleet-drivers') },
              ]
            : undefined,
        );
      }
    };

    // A driver already on another vehicle moves here: say so before it happens.
    const elsewhere = body.is_owner_self
      ? vehicles?.find((v) => v.id !== targetVehicleId && v.driver?.isOwnerSelf)
      : vehicles?.find(
          (v) =>
            v.id !== targetVehicleId &&
            lastTenDigits(v.driver?.phone ?? '') === lastTenDigits(driverPhone),
        );
    if (!elsewhere) {
      await send();
      return;
    }
    Alert.alert(
      'Move to this vehicle?',
      `${elsewhere.driver?.name ?? 'This driver'} is on ${elsewhere.plateNumber}. A driver has one vehicle, so that one will be left without a driver.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Move', onPress: () => void send() },
      ],
    );
  };

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <AppKeyboardAvoidingView>
        <AppScrollView
          style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
          contentContainerClassName="px-6 pb-16"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <AppView className="mb-3 min-h-[44px] justify-center">
            <LiquidGlassBackButton onPress={() => goBack(router)} />
          </AppView>

          {/* Header */}
          <AppView className="mb-6">
            <AppText className="text-[28px] font-black leading-tight tracking-tight text-foreground">
              Add driver
            </AppText>
            <AppText className="mt-1.5 text-[15px] leading-5 text-muted">
              Assign yourself, or add a driver by name and mobile number.
            </AppText>
          </AppView>

          {/* Self-Drive quick selection banner */}
          <AppPressable
            onPress={handleToggleSelfDrive}
            pressScale={0.98}
            className={`mb-6 rounded-2xl border p-4 ${
              isSelfDrive ? 'border-[#FF5722] bg-[#FF5722]/10' : 'border-border bg-card shadow-sm'
            }`}
          >
            <AppView row className="items-center justify-between">
              <AppView row className="items-center gap-3">
                <AppView
                  className={`h-10 w-10 items-center justify-center rounded-xl ${
                    isSelfDrive ? 'bg-[#FF5722]' : 'bg-surface-muted'
                  }`}
                >
                  <Icon
                    name="steeringwheel"
                    size={20}
                    tone={isSelfDrive ? 'background' : 'foreground'}
                  />
                </AppView>
                <AppView>
                  <AppText className="text-[15px] font-bold text-foreground">Drive myself</AppText>
                  <AppText className="text-[12px] text-muted">
                    {company?.ownerName
                      ? `Assign owner (${company.ownerName}) as driver`
                      : 'Assign owner as driver'}
                  </AppText>
                </AppView>
              </AppView>
              <AppView
                className={`h-6 w-6 items-center justify-center rounded-full border ${
                  isSelfDrive ? 'border-[#FF5722] bg-[#FF5722]' : 'border-muted bg-transparent'
                }`}
              >
                {isSelfDrive ? <Icon name="check" size={14} tone="background" /> : null}
              </AppView>
            </AppView>
          </AppPressable>

          {!isSelfDrive ? (
            <FleetDriverPicker
              drivers={joinedDrivers(members).filter((m) => m.vehicle?.id !== vehicleId)}
              disabled={assignDriverMutation.isPending}
              onPick={(member) => {
                const targetVehicleId = vehicleId || vehicles?.[0]?.id;
                if (targetVehicleId) {
                  void assignDriver(
                    targetVehicleId,
                    { driver_id: member.id },
                    member.name,
                    member.phone,
                  );
                }
              }}
            />
          ) : null}

          {!isSelfDrive ? (
            /* Driver Form Fields */
            <AppView className="gap-5">
              {/* Full name */}
              <TextField
                variant="outlined"
                label="Full name"
                required
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter driver's full name"
                autoCapitalize="words"
                leading={<Icon name="person" size={20} tone="icon-subtle" />}
                inputClassName="ml-2 text-[15px]"
              />

              {/* Phone number */}
              <TextField
                variant="outlined"
                label="Mobile number"
                required
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10-digit mobile number"
                keyboardType="phone-pad"
                leading={
                  <AppText className="text-[15px] font-bold text-foreground-secondary">+91</AppText>
                }
                inputClassName="ml-2 text-[15px]"
              />

              <AppText className="text-[13px] leading-5 text-muted">
                The driver signs in to the Ryno Partner app with this number and adds their own
                licence, date of birth and Aadhaar. They can start once the Ryno team approves them.
              </AppText>
            </AppView>
          ) : null}

          {/* Submit button */}
          <AppView className="mt-8">
            <Button
              variant="brand"
              label={assignDriverMutation.isPending ? 'Assigning...' : 'Assign Driver'}
              onPress={handleContinue}
              disabled={!isValid || assignDriverMutation.isPending}
              loading={assignDriverMutation.isPending}
              size="lg"
              textClassName="font-extrabold text-base"
            />
          </AppView>
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </AppView>
  );
}
