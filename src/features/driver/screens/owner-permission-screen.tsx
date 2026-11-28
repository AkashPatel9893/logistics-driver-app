import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import {
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Button,
  Icon,
  OtpInput,
} from '@/components/ui';
import { goToNextStep } from '@/features/registration/next-step';
import { useDriverProfile, useMyVehicles, useOwnerPermission } from '@/hooks/use-driver';
import { ApiError, getErrorMessage } from '@/lib/api/api-error';
import { capturePhoto } from '@/lib/photo-capture';

import { PhotoUploadBox } from '../components/photo-upload-box';
import { SetupScreenLayout } from '../components/setup-screen-layout';

/** Digits the backend's OTPs use (`otp_length` in GET /config). */
const CODE_LENGTH = 6;

function DoneRow({ text }: { text: string }) {
  return (
    <AppView row className="items-center gap-2">
      <Icon name="checkmark.circle.fill" size={18} color="#10b981" />
      <AppText className="text-[14px] font-semibold text-foreground">{text}</AppText>
    </AppView>
  );
}

const OTP_ERRORS: Record<string, string> = {
  OTP_INVALID: 'Wrong code. Check it with the owner and try again.',
  OTP_EXPIRED: 'The code has expired. Send a new one.',
  OTP_ATTEMPTS_EXCEEDED: 'Too many wrong tries. Send a new code.',
  OWNER_AUTH_INVALID: 'This permission is no longer valid. Contact support.',
};

function otpError(error: unknown) {
  return (error instanceof ApiError && OTP_ERRORS[error.code ?? '']) || getErrorMessage(error);
}

/**
 * The owner's permission when the driver does not own the vehicle: a photo of the owner's signed
 * NOC letter, and a code sent to the owner's phone. Both are needed before the application can
 * be reviewed. Opened after saving such a vehicle, and from its step until done.
 */
export function OwnerPermissionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const { data: profile } = useDriverProfile();
  const vehicleId = params.vehicleId ?? profile?.vehicle?.id ?? '';
  const vehiclesQuery = useMyVehicles();
  const vehicle = vehiclesQuery.data?.find((v) => v.id === vehicleId);
  const auth = vehicle?.owner_authorization ?? null;
  const { uploadNoc, requestOtp, verifyOtp } = useOwnerPermission(vehicleId);

  const [nocError, setNocError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const [code, setCode] = useState('');
  const [otpMessage, setOtpMessage] = useState<string>();

  const nocDone = auth?.noc_uploaded === true;
  const otpDone = auth?.owner_otp_verified === true;

  const pickNoc = async () => {
    const uri = await capturePhoto();
    if (!uri) return;
    setNocError(undefined);
    uploadNoc.mutate(uri, { onError: (e) => setNocError(getErrorMessage(e)) });
  };

  const sendCode = () => {
    setOtpMessage(undefined);
    requestOtp.mutate(undefined, {
      onSuccess: (res) => setSentTo(res.owner_phone_masked),
      onError: (e) => setOtpMessage(otpError(e)),
    });
  };

  const verify = (value: string) => {
    if (value.length !== CODE_LENGTH) return setOtpMessage(`Enter the ${CODE_LENGTH}-digit code.`);
    setOtpMessage(undefined);
    verifyOtp.mutate(value, {
      onError: (e) => {
        setCode('');
        setOtpMessage(otpError(e));
      },
    });
  };

  if (vehiclesQuery.isLoading) {
    return (
      <SetupScreenLayout title="Owner's permission" subtitle="For a vehicle you don't own">
        <AppSpinner />
      </SetupScreenLayout>
    );
  }

  if (!vehicle || !auth) {
    return (
      <SetupScreenLayout title="Owner's permission" subtitle="For a vehicle you don't own">
        <AppText className="p-5 text-center text-muted">
          No owner permission is needed for this vehicle.
        </AppText>
      </SetupScreenLayout>
    );
  }

  return (
    <SetupScreenLayout
      title="Owner's permission"
      subtitle={`${vehicle.registration_number} · owned by someone else`}
    >
      <AppScrollView contentContainerClassName="gap-5 px-5 pb-16 pt-4">
        <AppText className="text-[13px] text-muted">
          The owner must allow you to drive this vehicle. Both steps are needed before Ryno can
          review your application.
        </AppText>

        <AppView className="gap-3 rounded-2xl border border-border bg-card p-4">
          <AppText className="text-[15px] font-bold text-foreground">
            1. Owner&apos;s letter (NOC)
          </AppText>
          {nocDone ? (
            <DoneRow text="Letter uploaded" />
          ) : (
            <PhotoUploadBox
              title="Take a photo of the signed letter"
              hint="A letter from the owner saying you may drive this vehicle, with their signature."
              onSelectPhoto={() => void pickNoc()}
              uploading={uploadNoc.isPending}
              error={nocError}
            />
          )}
        </AppView>

        <AppView className="gap-3 rounded-2xl border border-border bg-card p-4">
          <AppText className="text-[15px] font-bold text-foreground">
            2. Code from the owner
          </AppText>
          {otpDone ? (
            <DoneRow text="Owner confirmed" />
          ) : sentTo ? (
            <>
              <AppText className="text-[13px] text-muted">
                {`We sent a code to the owner's phone ${sentTo}. Ask them for it and enter it here.`}
              </AppText>
              <OtpInput length={CODE_LENGTH} value={code} onChange={setCode} onComplete={verify} />
              <Button
                variant="brand"
                label={verifyOtp.isPending ? 'Checking…' : 'Confirm code'}
                loading={verifyOtp.isPending}
                disabled={verifyOtp.isPending}
                onPress={() => verify(code)}
              />
              <Button
                variant="outline"
                label="Send the code again"
                disabled={requestOtp.isPending}
                onPress={sendCode}
              />
            </>
          ) : (
            <>
              <AppText className="text-[13px] text-muted">
                {`We will text a code to the owner's phone ${auth.owner_phone_masked}.`}
              </AppText>
              <Button
                variant="brand"
                label={requestOtp.isPending ? 'Sending…' : 'Send code to owner'}
                loading={requestOtp.isPending}
                disabled={requestOtp.isPending}
                onPress={sendCode}
              />
            </>
          )}
          {otpMessage ? (
            <AppText className="text-[13px] font-medium text-error">{otpMessage}</AppText>
          ) : null}
        </AppView>

        {nocDone && otpDone ? (
          <Button
            variant="brand"
            size="lg"
            label="Continue"
            onPress={() => void goToNextStep(router, queryClient, 'vehicle')}
          />
        ) : null}
      </AppScrollView>
    </SetupScreenLayout>
  );
}
