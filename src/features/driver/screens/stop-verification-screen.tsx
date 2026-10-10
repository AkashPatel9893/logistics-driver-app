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
  Icon,
  LiquidGlassBackButton,
  OtpInput,
} from '@/components/ui';
import { useActiveJob, useVerifyDrop, useVerifyPickup } from '@/hooks/use-jobs';
import { getErrorMessage } from '@/lib/api/api-error';
import type { DriverJob } from '@/lib/api/models';
import { formatRupees } from '@/lib/format';

import { PaymentCollectCard } from '../components/payment-collect-card';
import { PhotoUploadBox } from '../components/photo-upload-box';
import { WaitingTimerRing } from '../components/waiting-timer-ring';
import { usePhotoUpload } from '../hooks/use-photo-upload';

type Stop = 'pickup' | 'drop';

/**
 * Whether a parcel / proof-of-delivery photo must be uploaded before the code is
 * accepted. Off until the backend has a photo upload endpoint — with it on today,
 * no pickup or delivery could be completed. Turn on as soon as uploads work.
 */
const PROOF_PHOTO_REQUIRED = false;

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

/** Whether the driver collects this job's fare at the given stop. */
function isPaymentDueAt(job: DriverJob, stop: Stop): boolean {
  const { payment } = job;
  if (payment.status !== 'pending') return false;
  if (payment.timing !== (stop === 'pickup' ? 'on-pickup' : 'on-delivery')) return false;
  // The backend reports an unpaid pay-on-delivery order as "prepaid" until a payment exists.
  return payment.mode === 'cash' || stop === 'drop';
}

function leaveStop(router: ReturnType<typeof useRouter>, stop: Stop, jobId: string) {
  if (stop === 'pickup') router.replace('/active-delivery');
  else router.replace({ pathname: '/trip-complete', params: { id: jobId } });
}

interface StopVerificationProps {
  job: DriverJob;
  stop: Stop;
  /** Code accepted and a payment is still due — hand over to the payment step. */
  onPaymentDue: (job: DriverJob) => void;
}

function StopVerification({ job, stop, onPaymentDue }: StopVerificationProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const copy = COPY[stop];
  const photo = usePhotoUpload(stop === 'pickup' ? 'pickup_photo' : 'drop_photo');
  const verifyPickup = useVerifyPickup();
  const verifyDrop = useVerifyDrop();
  const verify = stop === 'pickup' ? verifyPickup : verifyDrop;
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string>();

  const contact = stop === 'pickup' ? job.sender : (job.drop.contact ?? job.sender);
  const arrivedAt = stop === 'pickup' ? job.arrivedAtPickupAt : job.arrivedAtDropAt;
  const paymentDue = isPaymentDueAt(job, stop);

  const handleConfirm = () => {
    if (PROOF_PHOTO_REQUIRED && !photo.url) {
      Alert.alert(
        stop === 'pickup' ? 'Photo of the parcel needed' : 'Proof of delivery needed',
        'Take the photo before confirming.',
      );
      return;
    }
    if (otp.length < 4) {
      setOtpError(`Enter the 4-digit code from the ${copy.who}.`);
      return;
    }
    // mutateAsync: the updated job no longer matches this screen, which unmounts it.
    verify
      .mutateAsync({ id: job.id, otp, photoUrl: photo.url ?? undefined })
      .then((updated) => {
        // More stops to deliver: back to the trip for the next one.
        if (stop === 'drop' && updated.status !== 'delivered') {
          router.replace('/active-delivery');
          return;
        }
        // Payment is collected only once the code is verified, never before.
        if (paymentDue) onPaymentDue({ ...job, status: updated.status });
        else leaveStop(router, stop, updated.id);
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error);
        if (message.toLowerCase().includes('code')) setOtpError(message);
        else Alert.alert('Could not verify', message);
      });
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

            <AppPressable
              onPress={() => Linking.openURL(`tel:${contact.phone}`)}
              className="items-center py-1"
            >
              <AppText className="text-[14px] font-semibold text-brand">
                Call {contact.name.split(' ')[0]} for the code
              </AppText>
            </AppPressable>
          </AppView>

          {paymentDue ? (
            <AppView row className="items-center gap-2 rounded-2xl bg-surface-muted p-3.5">
              <Icon name="lock.fill" size={15} tone="icon-subtle" />
              <AppText className="flex-1 text-[13px] font-semibold text-foreground-secondary">
                Collect {formatRupees(job.payment.amount)} after the code is verified.
              </AppText>
            </AppView>
          ) : null}

          <Button
            variant="brand"
            label={paymentDue ? 'Verify code' : copy.cta}
            onPress={handleConfirm}
            loading={verify.isPending}
            disabled={photo.uploading}
            size="lg"
            className="rounded-full shadow-lg shadow-brand/25"
            textClassName="font-extrabold text-[16px]"
          />
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </AppView>
  );
}

/** Second step, reached only with a verified code: take the payment, then leave the stop. */
function PaymentStep({ job, stop }: { job: DriverJob; stop: Stop }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Cash is recorded by the card; a UPI payment lands on the live job over the socket.
  const [paidJob, setPaidJob] = useState<DriverJob | null>(null);
  const { data: active } = useActiveJob();
  const liveJob = active?.id === job.id && active.payment.status === 'collected' ? active : null;
  const current = paidJob ?? liveJob ?? job;
  const isCollected = current.payment.status === 'collected';

  return (
    <AppView className="flex-1 bg-[#FBFBFC] dark:bg-background">
      <FocusAwareStatusBar />

      <AppView style={{ paddingTop: Math.max(insets.top, 12) + 4 }} className="px-6 pb-2">
        <AppText className="text-[28px] font-black tracking-tight text-foreground">
          Collect payment
        </AppText>
        <AppText className="text-[15px] font-medium text-muted">Order #{job.number}</AppText>
      </AppView>

      <AppScrollView
        contentContainerClassName="gap-5 px-6 pb-12 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <AppView row className="items-center gap-2 rounded-2xl bg-emerald-500/10 p-3.5">
          <Icon name="checkmark.circle.fill" size={18} color="#10b981" />
          <AppText className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400">
            {stop === 'pickup' ? 'Pickup' : 'Delivery'} code verified
          </AppText>
        </AppView>

        <PaymentCollectCard job={current} onCollected={setPaidJob} />

        <Button
          variant="brand"
          label={
            isCollected
              ? stop === 'pickup'
                ? 'Start trip'
                : 'Finish delivery'
              : 'Collect payment to continue'
          }
          onPress={() => leaveStop(router, stop, job.id)}
          disabled={!isCollected}
          size="lg"
          className="rounded-full shadow-lg shadow-brand/25"
          textClassName="font-extrabold text-[16px]"
        />
      </AppScrollView>
    </AppView>
  );
}

function StopVerificationScreen({ stop }: { stop: Stop }) {
  const router = useRouter();
  const { data: job, isLoading } = useActiveJob();
  const [awaitingPayment, setAwaitingPayment] = useState<DriverJob | null>(null);
  const expected = stop === 'pickup' ? 'arrived_at_pickup' : 'arrived_at_drop';

  // Verifying moves the job past this stop, so the payment step works from its own copy.
  if (awaitingPayment) return <PaymentStep job={awaitingPayment} stop={stop} />;

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
  return <StopVerification job={job} stop={stop} onPaymentDue={setAwaitingPayment} />;
}

export function PickupVerificationScreen() {
  return <StopVerificationScreen stop="pickup" />;
}

export function DropVerificationScreen() {
  return <StopVerificationScreen stop="drop" />;
}
