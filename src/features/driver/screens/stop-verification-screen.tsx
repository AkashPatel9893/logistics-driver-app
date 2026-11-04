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
  Avatar,
  Button,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
  OtpInput,
} from '@/components/ui';
import {
  useActiveJob,
  useClearFinishedJob,
  useVerifyDrop,
  useVerifyPickup,
} from '@/hooks/use-jobs';
import { getErrorMessage } from '@/lib/api/api-error';
import type { DriverJob } from '@/lib/api/models';
import { formatRupees } from '@/lib/format';

import { PaymentCollectCard } from '../components/payment-collect-card';
import { PhotoUploadBox } from '../components/photo-upload-box';
import { WaitingBar } from '../components/waiting-bar';
import { usePhotoUpload } from '../hooks/use-photo-upload';
import { goBack } from '@/lib/go-back';

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
    title: 'Verify pickup',
    who: 'sender',
    photoTitle: 'Photo of the parcel',
    photoHint: 'Photograph the parcel as you receive it — it protects you in disputes.',
    cta: 'Confirm pickup',
  },
  drop: {
    title: 'Verify delivery',
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
  // Multi-stop: the backend completes each stop with its code and records cash after the trip.
  if (stop === 'drop' && (job.stops ?? []).filter((s) => s.stopType === 'DROP').length > 1) {
    return false;
  }
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
  const [otpAttempt, setOtpAttempt] = useState(0);

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
        // Payment is collected only once the code is verified, never before.
        if (paymentDue) {
          onPaymentDue({ ...job, status: updated.status });
          return;
        }
        // More stops to deliver: back to the trip for the next one.
        if (stop === 'drop' && updated.status !== 'delivered') {
          router.replace('/active-delivery');
          return;
        }
        leaveStop(router, stop, updated.id);
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error);
        if (/invalid/i.test(message) && /otp|code/i.test(message)) {
          // Ready to retype straight away: the boxes empty and the keyboard comes back.
          setOtp('');
          setOtpAttempt((attempt) => attempt + 1);
          setOtpError(`That code is not right. Check it with the ${copy.who} and try again.`);
        } else if (message.toLowerCase().includes('code')) setOtpError(message);
        else Alert.alert('Could not verify', message);
      });
  };

  const firstName =
    contact.name.split(' ')[0] || (stop === 'pickup' ? 'the sender' : 'the receiver');
  const showCodeHelp = () =>
    Alert.alert(
      "Customer can't find the code?",
      stop === 'pickup'
        ? 'The sender sees the pickup code on the order tracking screen in their RYNO app, under the order number.'
        : 'The sender sees the delivery code on the order tracking screen and can share it with the receiver using "Share code".',
      [
        { text: 'OK', style: 'cancel' },
        { text: 'Call sender', onPress: () => Linking.openURL(`tel:${job.sender.phone}`) },
      ],
    );

  return (
    <AppView className="flex-1 bg-[#FBFBFC] dark:bg-background">
      <FocusAwareStatusBar />

      <AppView style={{ paddingTop: Math.max(insets.top, 12) + 4 }} className="px-5 pb-3">
        <AppView row className="items-center gap-3">
          <LiquidGlassBackButton onPress={() => goBack(router)} />
          <AppView className="flex-1">
            <AppText className="text-[22px] font-black tracking-tight text-foreground">
              {copy.title}
            </AppText>
            <AppText className="text-[13px] font-medium text-muted">Order #{job.number}</AppText>
          </AppView>
        </AppView>
      </AppView>

      <AppKeyboardAvoidingView>
        <AppScrollView
          contentContainerClassName="gap-4 px-5 pb-6 pt-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Who the driver is meeting, with the call one tap away. */}
          <AppView
            row
            className="items-center gap-3 rounded-2xl border border-border/80 bg-card p-3.5"
          >
            <Avatar name={contact.name} size="md" />
            <AppView className="flex-1">
              <AppText numberOfLines={1} className="text-[15px] font-bold text-foreground">
                {contact.name}
              </AppText>
              <AppText numberOfLines={1} className="text-[12px] text-muted">
                {stop === 'pickup' ? 'Sender' : 'Receiver'} ·{' '}
                {stop === 'pickup' ? job.pickup.label : job.drop.label}
              </AppText>
            </AppView>
            <AppPressable
              onPress={() => Linking.openURL(`tel:${contact.phone}`)}
              accessibilityLabel={`Call ${contact.name}`}
              className="size-11 items-center justify-center rounded-full bg-brand"
            >
              <Icon name="phone.fill" size={18} color="#ffffff" />
            </AppPressable>
          </AppView>

          {arrivedAt ? <WaitingBar arrivedAt={arrivedAt} /> : null}

          <AppView className="items-center gap-3 rounded-[24px] border border-border/80 bg-card px-4 py-5 shadow-sm">
            <AppText className="text-center text-[17px] font-black text-foreground">
              Enter {stop === 'pickup' ? 'pickup' : 'delivery'} code
            </AppText>
            <AppText className="text-center text-[13px] leading-5 text-muted">
              Ask {firstName} for the 4-digit code in their RYNO{' '}
              {stop === 'pickup' ? 'app' : 'tracking link'}.
            </AppText>
            {/* Above the boxes: the keyboard reopens after a wrong code and would cover it below. */}
            {otpError ? (
              <AppText className="text-center text-[13px] font-medium text-error">
                {otpError}
              </AppText>
            ) : null}
            <OtpInput
              key={otpAttempt}
              length={4}
              value={otp}
              onChange={(value) => {
                setOtp(value);
                setOtpError(undefined);
              }}
              // Reveal the confirm button once the code is in.
              onComplete={() => Keyboard.dismiss()}
            />
            <AppPressable onPress={showCodeHelp} hitSlop={8} className="py-1">
              <AppText className="text-[13px] font-semibold text-brand">
                Customer can&apos;t find the code?
              </AppText>
            </AppPressable>
          </AppView>

          <AppView className="gap-2">
            <AppText className="px-1 text-[12px] font-bold uppercase tracking-wider text-muted">
              Optional · recommended
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
          </AppView>
        </AppScrollView>

        {/* Pinned, so the action is never below the fold or behind the keyboard. */}
        <AppView
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          className="gap-2 border-t border-border/60 bg-[#FBFBFC] px-5 pt-3 dark:bg-background"
        >
          {paymentDue ? (
            <AppView row className="items-center justify-center gap-1.5">
              <Icon name="banknote" size={14} tone="icon-subtle" />
              <AppText className="text-[12px] font-semibold text-muted">
                Next: collect {formatRupees(job.payment.amount)} in cash
              </AppText>
            </AppView>
          ) : null}
          <Button
            variant="brand"
            label={paymentDue ? 'Verify code' : copy.cta}
            onPress={handleConfirm}
            loading={verify.isPending}
            disabled={photo.uploading || otp.length < 4}
            size="lg"
            className="rounded-full shadow-lg shadow-brand/25"
            textClassName="font-extrabold text-[16px]"
          />
        </AppView>
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
  const clearFinishedJob = useClearFinishedJob();

  const handleContinue = () => {
    // Cash at the drop ends the trip: Home must not show it as still awaiting payment.
    if (stop === 'drop') clearFinishedJob(job.id);
    leaveStop(router, stop, job.id);
  };

  const payer = stop === 'pickup' ? job.sender : (job.drop.contact ?? job.sender);
  const payerName = payer.name.split(' ')[0] || 'the customer';
  // Anything above the quoted fare is the waiting charge the backend added.

  return (
    <AppView className="flex-1 bg-[#FBFBFC] dark:bg-background">
      <FocusAwareStatusBar />

      <AppView style={{ paddingTop: Math.max(insets.top, 12) + 4 }} className="px-5 pb-3">
        <AppText className="text-[22px] font-black tracking-tight text-foreground">
          {isCollected ? 'Payment received' : 'Collect payment'}
        </AppText>
        <AppText className="text-[13px] font-medium text-muted">Order #{job.number}</AppText>
      </AppView>

      <AppScrollView
        contentContainerClassName="gap-4 px-5 pb-6 pt-1"
        showsVerticalScrollIndicator={false}
      >
        <AppView row className="items-center gap-2 rounded-2xl bg-emerald-500/10 px-3.5 py-3">
          <Icon name="checkmark.circle.fill" size={16} color="#10b981" />
          <AppText className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400">
            {stop === 'pickup' ? 'Pickup' : 'Delivery'} code verified
          </AppText>
        </AppView>

        <AppView className="items-center rounded-[24px] border border-border/80 bg-card px-5 py-6 shadow-sm">
          {isCollected ? (
            <AppView className="mb-3 size-14 items-center justify-center rounded-full bg-emerald-500/15">
              <Icon name="checkmark" size={26} color="#10b981" />
            </AppView>
          ) : null}
          <AppText className="text-[13px] font-semibold text-muted">
            {isCollected
              ? `Received from ${payerName} in ${current.payment.collectedVia === 'upi' ? 'UPI' : 'cash'}`
              : `Collect from ${payerName}`}
          </AppText>
          <AppText className="mt-1 text-[40px] font-black tracking-tight text-foreground">
            {formatRupees(current.payment.amount)}
          </AppText>
          {isCollected ? null : (
            <AppText className="mt-2 text-center text-[12px] text-muted">
              Count the cash before you confirm.
            </AppText>
          )}
        </AppView>

        {isCollected ? null : <PaymentCollectCard job={current} onCollected={setPaidJob} />}
      </AppScrollView>

      {isCollected ? (
        <AppView
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          className="border-t border-border/60 px-5 pt-3"
        >
          <Button
            variant="brand"
            label={stop === 'pickup' ? 'Start trip' : 'Finish delivery'}
            onPress={handleContinue}
            size="lg"
            className="rounded-full shadow-lg shadow-brand/25"
            textClassName="font-extrabold text-[16px]"
          />
        </AppView>
      ) : null}
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
  // Code already verified earlier (e.g. the app was reopened): go straight to collecting payment.
  if (stop === 'drop' && job?.status === 'awaiting_payment') {
    return <PaymentStep job={job} stop={stop} />;
  }

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
