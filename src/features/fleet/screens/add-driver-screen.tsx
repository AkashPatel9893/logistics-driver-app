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

import { useFleetStore } from '../use-fleet-store';
import type { FleetDriver } from '../types';

export function AddDriverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const vehicleId = params.vehicleId;

  const company = useFleetStore.use.company();
  const assignDriver = useFleetStore.use.assignDriver();
  const vehicles = useFleetStore.use.vehicles();

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
      setFullName(company.ownerName || 'Arun Kumar');
      setPhone(
        company.phone ? company.phone.replace(/^\+91/, '').replace(/\D/g, '') : '9876543210',
      );
      setDob('12 / 05 / 1990');
      setDlNumber('KA0320180012345');
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

  const isValid =
    fullName.trim().length >= 2 &&
    phone.trim().length >= 10 &&
    dob.trim().length >= 8 &&
    dlNumber.trim().length >= 6;

  const handleContinue = () => {
    if (!isValid) {
      Alert.alert(
        'Incomplete details',
        'Please fill in all driver information and upload documents.',
      );
      return;
    }

    const driver: FleetDriver = {
      id: `driver-${Date.now()}`,
      name: fullName.trim(),
      phone: `+91 ${phone.trim()}`,
      dob,
      dlNumber: dlNumber.trim().toUpperCase(),
      rating: 5.0,
      isOwnerSelf: isSelfDrive,
      aadhaarUploaded,
      dlUploaded,
    };

    if (vehicleId) {
      assignDriver(vehicleId, driver);
    } else if (vehicles.length > 0) {
      // Assign to the most recently added vehicle
      assignDriver(vehicles[0].id, driver);
    }

    Alert.alert(
      'Driver added',
      isSelfDrive
        ? 'You have been assigned as the active driver for this vehicle.'
        : `${fullName} has been added and assigned to the vehicle.`,
      [
        {
          text: 'Continue',
          onPress: () => router.back(),
        },
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
            <LiquidGlassBackButton onPress={() => router.back()} />
          </AppView>

          {/* Header */}
          <AppView className="mb-6">
            <AppText className="text-[28px] font-black leading-tight tracking-tight text-foreground">
              Add driver
            </AppText>
            <AppText className="mt-1.5 text-[15px] leading-5 text-muted">
              Tell us a little about yourself to set up your driver profile.
            </AppText>
          </AppView>

          {/* Self-Drive quick selection banner */}
          <AppPressable
            onPress={handleToggleSelfDrive}
            pressScale={0.98}
            className={`mb-6 rounded-2xl border p-4 shadow-sm ${
              isSelfDrive ? 'border-[#FF5722] bg-[#FF5722]/10' : 'border-border bg-card'
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
                    color={isSelfDrive ? '#ffffff' : '#FF5722'}
                  />
                </AppView>
                <AppView>
                  <AppText className="text-[15px] font-bold text-foreground">
                    I will drive this vehicle myself
                  </AppText>
                  <AppText className="text-[12px] text-muted">
                    Assign owner ({company.ownerName || 'Arun Kumar'}) as driver
                  </AppText>
                </AppView>
              </AppView>
              <AppView
                className={`h-6 w-6 items-center justify-center rounded-full border ${
                  isSelfDrive ? 'border-[#FF5722] bg-[#FF5722]' : 'border-border'
                }`}
              >
                {isSelfDrive ? <Icon name="check" size={14} color="#ffffff" /> : null}
              </AppView>
            </AppView>
          </AppPressable>

          {/* Form fields */}
          <AppView className="gap-5">
            {/* Full name */}
            <TextField
              variant="outlined"
              label="Full name"
              required
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              autoCapitalize="words"
              leading={<Icon name="person" size={20} tone="icon-subtle" />}
              inputClassName="ml-2 text-[15px]"
            />

            {/* Phone Number */}
            <TextField
              variant="outlined"
              label="Phone Number"
              required
              value={phone}
              onChangeText={(text) => setPhone(text.replace(/\D/g, '').slice(0, 10))}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              leading={
                <AppText className="text-[15px] font-bold text-foreground-secondary">+91</AppText>
              }
              inputClassName="ml-2 text-[15px]"
            />

            {/* Date of birth */}
            <TextField
              variant="outlined"
              label="Date of birth"
              required
              value={dob}
              onChangeText={handleDobChange}
              placeholder="DD / MM / YYYY"
              keyboardType="number-pad"
              maxLength={14}
              leading={<Icon name="calendar" size={20} tone="icon-subtle" />}
              inputClassName="ml-2 text-[15px]"
            />

            {/* Driving licence number */}
            <TextField
              variant="outlined"
              label="Driving licence number"
              required
              value={dlNumber}
              onChangeText={(text) => setDlNumber(text.toUpperCase())}
              placeholder="Enter licence number"
              autoCapitalize="characters"
              leading={<Icon name="creditcard" size={20} tone="icon-subtle" />}
              inputClassName="ml-2 text-[15px]"
            />

            {/* Identity proof section */}
            <AppView className="mt-2 gap-3">
              <AppText className="text-[15px] font-bold text-foreground">Identity proof</AppText>

              {/* Upload Aadhaar card */}
              <AppView className="rounded-2xl border border-dashed border-[#FF5722]/50 bg-card p-4">
                <AppView row className="items-center justify-between">
                  <AppView row className="flex-1 items-center gap-3">
                    <AppView className="h-10 w-10 items-center justify-center rounded-xl bg-[#FF5722]/10">
                      <Icon name="arrow.up.doc" size={20} tone="brand" />
                    </AppView>
                    <AppView className="flex-1 pr-2">
                      <AppText className="text-[14px] font-bold text-foreground">
                        Upload Aadhaar card
                      </AppText>
                      <AppText className="text-[12px] text-muted">
                        Front and back · PDF, JPG or PNG
                      </AppText>
                    </AppView>
                  </AppView>
                  <AppPressable
                    onPress={() => setAadhaarUploaded((prev) => !prev)}
                    className={`rounded-xl px-4 py-2 ${
                      aadhaarUploaded ? 'bg-emerald-500/15' : 'bg-surface-muted'
                    }`}
                  >
                    <AppText
                      className={`text-[12px] font-bold ${
                        aadhaarUploaded
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-foreground'
                      }`}
                    >
                      {aadhaarUploaded ? 'Uploaded' : 'Upload'}
                    </AppText>
                  </AppPressable>
                </AppView>
              </AppView>

              {/* Upload driving licence */}
              <AppView className="rounded-2xl border border-dashed border-[#FF5722]/50 bg-card p-4">
                <AppView row className="items-center justify-between">
                  <AppView row className="flex-1 items-center gap-3">
                    <AppView className="h-10 w-10 items-center justify-center rounded-xl bg-[#FF5722]/10">
                      <Icon name="arrow.up.doc" size={20} tone="brand" />
                    </AppView>
                    <AppView className="flex-1 pr-2">
                      <AppText className="text-[14px] font-bold text-foreground">
                        Upload driving licence
                      </AppText>
                      <AppText className="text-[12px] text-muted">
                        Make sure all details are clearly visible
                      </AppText>
                    </AppView>
                  </AppView>
                  <AppPressable
                    onPress={() => setDlUploaded((prev) => !prev)}
                    className={`rounded-xl px-4 py-2 ${
                      dlUploaded ? 'bg-emerald-500/15' : 'bg-surface-muted'
                    }`}
                  >
                    <AppText
                      className={`text-[12px] font-bold ${
                        dlUploaded ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                      }`}
                    >
                      {dlUploaded ? 'Uploaded' : 'Upload'}
                    </AppText>
                  </AppPressable>
                </AppView>
              </AppView>
            </AppView>
          </AppView>

          {/* Continue button */}
          <AppView className="mt-8">
            <Button
              variant="brand"
              label="Continue"
              onPress={handleContinue}
              disabled={!isValid}
              size="lg"
              textClassName="font-extrabold text-base"
            />

            <AppView row className="mt-5 items-center justify-center gap-1.5">
              <Icon name="shield" size={14} tone="icon-subtle" />
              <AppText className="text-center text-[12px] text-muted">
                Your details are kept private and secure.
              </AppText>
            </AppView>
          </AppView>
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </AppView>
  );
}
