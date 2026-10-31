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
import { useAssignFleetDriver, useFleetCompany, useFleetVehicles } from '@/hooks/use-fleet';
import type { AssignDriverRequest } from '@/lib/api/fleet';

function parseDobToIso(formatted: string): string | undefined {
  const parts = formatted.split('/').map((s) => s.trim());
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (day && month && year && year.length === 4) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return undefined;
}

export function AddDriverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const vehicleId = params.vehicleId;

  const { data: company } = useFleetCompany();
  const { data: vehicles } = useFleetVehicles();
  const assignDriverMutation = useAssignFleetDriver();

  const [isSelfDrive, setIsSelfDrive] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [dlNumber, setDlNumber] = useState('');
  const [aadhaarUploaded, setAadhaarUploaded] = useState(false);
  const [dlUploaded, setDlUploaded] = useState(false);

  const handleToggleSelfDrive = () => {
    if (!isSelfDrive) {
      setIsSelfDrive(true);
      setFullName(company?.ownerName || '');
      setPhone(
        company?.phone ? company.phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10) : '',
      );
      setDob('');
      setDlNumber('');
      setAadhaarUploaded(true);
      setDlUploaded(true);
    } else {
      setIsSelfDrive(false);
      setFullName('');
      setPhone('');
      setDob('');
      setDlNumber('');
      setAadhaarUploaded(false);
      setDlUploaded(false);
    }
  };

  const handleDobChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)} / ${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)} / ${cleaned.slice(2, 4)} / ${cleaned.slice(4, 8)}`;
    }
    setDob(formatted);
  };

  const isoDob = parseDobToIso(dob);

  const isValid = isSelfDrive
    ? true
    : fullName.trim().length >= 2 &&
      phone.trim().length >= 10 &&
      Boolean(isoDob) &&
      dlNumber.trim().length >= 6;

  const handleContinue = async () => {
    const targetVehicleId = vehicleId || vehicles?.[0]?.id;
    if (!targetVehicleId) {
      Alert.alert('No vehicle available', 'Please add a vehicle to your fleet first.');
      return;
    }

    if (!isValid) {
      Alert.alert(
        'Incomplete details',
        'Please enter full name, 10-digit phone number, valid DOB (DD/MM/YYYY), and DL number.',
      );
      return;
    }

    const body: AssignDriverRequest = isSelfDrive
      ? { is_owner_self: true }
      : {
          is_owner_self: false,
          name: fullName.trim(),
          phone: `+91 ${phone.trim().slice(-10)}`,
          dob: isoDob,
          dl_number: dlNumber.trim().toUpperCase(),
        };

    try {
      await assignDriverMutation.mutateAsync({ vehicleId: targetVehicleId, body });
      Alert.alert(
        'Driver assigned',
        isSelfDrive
          ? 'You have been assigned as the active driver for this vehicle.'
          : `${fullName.trim()} has been assigned to the vehicle.`,
        [
          {
            text: 'Continue',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to assign driver.';
      Alert.alert('Assignment Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
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
            <LiquidGlassBackButton onPress={() => router.back()} />
          </AppView>

          {/* Header */}
          <AppView className="mb-6">
            <AppText className="text-[28px] font-black leading-tight tracking-tight text-foreground">
              Add driver
            </AppText>
            <AppText className="mt-1.5 text-[15px] leading-5 text-muted">
              Assign yourself or a new driver to your fleet vehicle.
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
                label="Phone number*"
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

              {/* Date of birth */}
              <TextField
                variant="outlined"
                label="Date of birth*"
                required
                value={dob}
                onChangeText={handleDobChange}
                placeholder="DD / MM / YYYY"
                keyboardType="numeric"
                maxLength={14}
                leading={<Icon name="calendar" size={20} tone="icon-subtle" />}
                inputClassName="ml-2 text-[15px]"
              />

              {/* DL number */}
              <TextField
                variant="outlined"
                label="Driving Licence number*"
                required
                value={dlNumber}
                onChangeText={(text) => setDlNumber(text.toUpperCase().slice(0, 16))}
                placeholder="e.g. DL-1420110012345"
                autoCapitalize="characters"
                autoCorrect={false}
                leading={<Icon name="document" size={20} tone="icon-subtle" />}
                inputClassName="ml-2 text-[15px]"
              />

              {/* Document upload checklist */}
              <AppView className="mt-2 gap-3">
                <AppText className="text-[13px] font-bold text-foreground">
                  Verification Documents
                </AppText>

                <AppPressable
                  onPress={() => setAadhaarUploaded((prev) => !prev)}
                  className="flex-row items-center justify-between rounded-2xl border border-dashed border-border bg-card p-4 active:bg-neutral-100 dark:active:bg-neutral-800"
                >
                  <AppView row className="items-center gap-3">
                    <Icon name="doc.text.fill" size={20} tone="icon-subtle" />
                    <AppView>
                      <AppText className="text-[14px] font-bold text-foreground">
                        Aadhaar Card
                      </AppText>
                      <AppText className="text-[12px] text-muted">Front & back copy</AppText>
                    </AppView>
                  </AppView>
                  <AppView
                    className={`rounded-full px-3 py-1 ${
                      aadhaarUploaded ? 'bg-emerald-500/15' : 'bg-surface-muted'
                    }`}
                  >
                    <AppText
                      className={`text-[11px] font-bold ${
                        aadhaarUploaded
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-foreground'
                      }`}
                    >
                      {aadhaarUploaded ? 'Attached' : 'Attach'}
                    </AppText>
                  </AppView>
                </AppPressable>

                <AppPressable
                  onPress={() => setDlUploaded((prev) => !prev)}
                  className="flex-row items-center justify-between rounded-2xl border border-dashed border-border bg-card p-4 active:bg-neutral-100 dark:active:bg-neutral-800"
                >
                  <AppView row className="items-center gap-3">
                    <Icon name="doc.text.fill" size={20} tone="icon-subtle" />
                    <AppView>
                      <AppText className="text-[14px] font-bold text-foreground">
                        Driving Licence
                      </AppText>
                      <AppText className="text-[12px] text-muted">Commercial / LMV licence</AppText>
                    </AppView>
                  </AppView>
                  <AppView
                    className={`rounded-full px-3 py-1 ${
                      dlUploaded ? 'bg-emerald-500/15' : 'bg-surface-muted'
                    }`}
                  >
                    <AppText
                      className={`text-[11px] font-bold ${
                        dlUploaded ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                      }`}
                    >
                      {dlUploaded ? 'Attached' : 'Attach'}
                    </AppText>
                  </AppView>
                </AppPressable>
              </AppView>
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
