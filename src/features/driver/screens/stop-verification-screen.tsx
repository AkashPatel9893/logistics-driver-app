import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Keyboard, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppKeyboardAvoidingView,
  AppPressable,
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  LiquidGlassBackButton,
  OtpInput,
} from '@/components/ui';
import { useActiveJob, useDemoOtps, useVerifyDrop, useVerifyPickup } from '@/hooks/use-jobs';
import { getErrorMessage } from '@/lib/api/api-error';
import type { DriverJob } from '@/lib/api/models';

import { DemoOtpHint } from '../components/demo-otp-hint';
import { PaymentCollectCard } from '../components/payment-collect-card';
import { PhotoUploadBox } from '../components/photo-upload-box';
import { WaitingTimerRing } from '../components/waiting-timer-ring';
import { usePhotoUpload } from '../hooks/use-photo-upload';

type Stop = 'pickup' | 'drop';

const COPY: Record<
  Stop,
  { title: string; who: 'sender' | 'receiver'; photoTitle: string; photoHint: string; cta: string }
> = {
  pickup: {
    title: 'Pickup verification',
    who: 'sender',
    photoTitle: 'Photo of the parcel',
    photoHint: 'Photograph the parcel as you receive it — it protects you in disputes.',
    cta: 'Confirm pickup',
  },
  drop: {
    title: 'Drop verification',
    who: 'receiver',
    photoTitle: 'Proof of delivery',
    photoHint: 'Photograph the parcel handed over at the drop location.',
    cta: 'Confirm delivery',
  },
};

function StopVerification({ job, stop }: { job: DriverJob; stop: Stop }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const copy = COPY[stop];
  const photo = usePhotoUpload(stop === 'pickup' ? 'pickup_photo' : 'drop_photo');
  const verifyPickup = useVerifyPickup();
  const verifyDrop = useVerifyDrop();
  const verify = stop === 'pickup' ? verifyPickup : verifyDrop;
  const demoOtps = useDemoOtps(job.id);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string>();

  const contact = stop === 'pickup' ? job.sender : (job.drop.contact ?? job.sender);
  const arrivedAt = stop === 'pickup' ? job.arrivedAtPickupAt : job.arrivedAtDropAt;
  const timing = stop === 'pickup' ? 'on-pickup' : 'on-delivery';
  const needsPayment = job.payment.mode === 'cash' && job.payment.timing === timing;
  const paymentPending = needsPayment && job.payment.status === 'pending';

  const handleConfirm = () => {
    if (!photo.url) {
      Alert.alert('Photo required', `Take a photo of the parcel before confirming.`);
      return;
    }
    if (otp.length < 4) {
      setOtpError(`Enter the 4-digit code from the ${copy.who}.`);
      return;
    }
    verify.mutate(
      { id: job.id, otp, photoUrl: photo.url },
      {
        onSuccess: (updated) => {
          if (stop === 'pickup') router.replace('/active-delivery');
          else router.replace({ pathname: '/trip-complete', params: { id: updated.id } });
        },
        onError: (error) => {
          const message = getErrorMessage(error);
          if (message.toLowerCase().includes('code')) setOtpError(message);
          else Alert.alert('Could not verify', message);
        },
      },
    );
  };

  return (
    <AppView className="flex-1 bg-[#FBFBFC] dark:bg-background">
      <FocusAwareStatusBar />

      <AppView style={{ paddingTop: Math.max(insets.top, 12) + 4 }} className="px-6 pb-2">
        <AppView row className="items-center justify-between">
          <AppView>
            <AppText className="text-[28px] font-black tracking-tight text-foreground">
              {copy.title}
            </AppText>
            <AppText className="text-[15px] font-medium text-muted">Order #{job.number}</AppText>
          </AppView>
          <LiquidGlassBackButton onPress={() => router.back()} />
        </AppView>
      </AppView>

      <AppKeyboardAvoidingView>
        <AppScrollView
          contentContainerClassName="gap-5 px-6 pb-12 pt-2"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {arrivedAt ? <WaitingTimerRing arrivedAt={arrivedAt} contactName={contact.name} /> : null}

          <AppView className="gap-4 rounded-[28px] border border-border/80 bg-card p-5 shadow-sm">
            <AppText className="text-[18px] font-black text-foreground">
              Verify with {contact.name.split(' ')[0]}
            </AppText>

            <PhotoUploadBox
              variant="compact"
              title={copy.photoTitle}
              hint={copy.photoHint}
              photoUri={photo.previewUri}
              uploading={photo.uploading}
              error={photo.error}
              onSelectPhoto={photo.pick}
            />

            {needsPayment ? <PaymentCollectCard job={job} /> : null}

            <AppText className="text-[14px] leading-5 text-muted">
              Ask {contact.name.split(' ')[0]} for the 4-digit{' '}
              {stop === 'pickup' ? 'pickup' : 'delivery'} code shown in their RYNO{' '}
              {stop === 'pickup' ? 'app' : 'tracking link'}.
            </AppText>

            <AppView className="items-center gap-2 py-1">
              <OtpInput
                length={4}
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  setOtpError(undefined);
                }}
                // Reveal the confirm button once the code is in.
                onComplete={() => Keyboard.dismiss()}
              />
              {otpError ? (
                <AppText className="text-center text-[13px] font-medium text-error">
                  {otpError}
                </AppText>
              ) : null}
            </AppView>

            <DemoOtpHint
              who={copy.who}
              otp={stop === 'pickup' ? demoOtps.data?.pickupOtp : demoOtps.data?.deliveryOtp}
            />

            <AppPressable
              onPress={() => Linking.openURL(`tel:${contact.phone}`)}
              className="items-center py-1 active:opacity-70"
            >
              <AppText className="text-[14px] font-semibold text-brand">
                Call {contact.name.split(' ')[0]} for the code
              </AppText>
            </AppPressable>
          </AppView>

          <Button
            variant="brand"
            label={paymentPending ? 'Collect payment to continue' : copy.cta}
            onPress={handleConfirm}
            loading={verify.isPending}
            disabled={paymentPending || photo.uploading}
            size="lg"
            className="rounded-full shadow-lg shadow-brand/25"
            textClassName="font-extrabold text-[16px]"
          />
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </AppView>
  );
}

function StopVerificationScreen({ stop }: { stop: Stop }) {
  const router = useRouter();
  const { data: job, isLoading } = useActiveJob();
  const expected = stop === 'pickup' ? 'arrived_at_pickup' : 'arrived_at_drop';

  if (!job || job.status !== expected) {
    return (
      <AppView className="flex-1 items-center justify-center bg-background p-6">
        {isLoading ? (
          <AppSpinner size="large" />
        ) : (
          <>
            <AppText className="text-center text-[16px] font-bold text-foreground">
              Nothing to verify here right now.
            </AppText>
            <Button
              label="Back to trip"
              className="mt-5"
              onPress={() => router.replace(job ? '/active-delivery' : '/home')}
            />
          </>
        )}
      </AppView>
    );
  }
  return <StopVerification job={job} stop={stop} />;
}

export function PickupVerificationScreen() {
  return <StopVerificationScreen stop="pickup" />;
}

export function DropVerificationScreen() {
  return <StopVerificationScreen stop="drop" />;
}
