import { useRouter } from 'expo-router';
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
  OtpInput,
} from '@/components/ui';
import { useDriverStore } from '@/stores/driver-store';

import { PhotoUploadBox } from '../components/photo-upload-box';

export function DropVerificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const activeJob = useDriverStore((s) => s.activeJob);
  const markPaymentCollected = useDriverStore((s) => s.markPaymentCollected);
  const setDropPhoto = useDriverStore((s) => s.setDropPhoto);
  const completeTrip = useDriverStore((s) => s.completeTrip);

  const [otp, setOtp] = useState('7319');
  const [photoUri, setLocalPhotoUri] = useState<string | null>(
    activeJob?.dropPhoto ||
      'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
  );

  const isCash = activeJob?.paymentMode === 'Cash';
  const paymentCollected = activeJob?.paymentCollected || false;

  const handleSelectPhoto = () => {
    const sample =
      'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80';
    setLocalPhotoUri(sample);
    setDropPhoto(sample);
  };

  const handleCollectPaymentQR = () => {
    router.push('/payment-qr');
  };

  const handleCompleteDelivery = () => {
    if (otp.length < 4) {
      Alert.alert(
        'Incomplete OTP',
        'Please enter the 4-digit delivery verification code given by the recipient.',
      );
      return;
    }
    if (isCash && !paymentCollected) {
      Alert.alert(
        'Collect Payment First',
        `Please collect ₹${activeJob?.fare || 620} from the recipient before finishing delivery.`,
        [
          { text: 'Collect via QR', onPress: handleCollectPaymentQR },
          {
            text: 'Mark Cash Received',
            style: 'default',
            onPress: () => {
              markPaymentCollected();
              completeTrip();
              router.replace('/trip-complete');
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    if (photoUri) {
      setDropPhoto(photoUri);
    }
    completeTrip();
    router.replace('/trip-complete');
  };

  const orderRef = activeJob ? `MV-${activeJob.id.slice(-4).toUpperCase()}` : 'MV-2048';

  return (
    <AppView className="flex-1 bg-[#FBFBFC] dark:bg-background">
      <FocusAwareStatusBar />

      <AppView style={{ paddingTop: Math.max(insets.top, 12) + 4 }} className="px-6 pb-2">
        <AppView row className="items-center justify-between">
          <AppView>
            <AppText className="text-[28px] font-black tracking-tight text-foreground">
              Drop verification
            </AppText>
            <AppText className="text-[15px] font-medium text-muted">Booking #{orderRef}</AppText>
          </AppView>
          <LiquidGlassBackButton onPress={() => router.back()} />
        </AppView>
      </AppView>

      <AppKeyboardAvoidingView>
        <AppScrollView
          contentContainerClassName="px-6 pb-12 pt-2 gap-5"
          showsVerticalScrollIndicator={false}
        >
          <AppView className="rounded-[28px] border border-border/80 bg-card p-5 shadow-sm gap-4">
            <AppText className="text-[18px] font-black text-foreground">Verify Delivery</AppText>

            <PhotoUploadBox
              variant="compact"
              title="Take delivery photo"
              hint="Capture a clear photo of the delivered package at the drop-off location."
              photoUri={photoUri}
              onSelectPhoto={handleSelectPhoto}
            />

            {isCash ? (
              paymentCollected ? (
                <AppView className="rounded-2xl bg-emerald-500/10 p-3.5">
                  <AppView row className="items-center gap-2">
                    <Icon name="checkmark.circle.fill" size={18} color="#10b981" />
                    <AppText className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400">
                      ₹{activeJob?.fare || 620} Payment Collected via Cash / QR
                    </AppText>
                  </AppView>
                </AppView>
              ) : (
                <AppView className="gap-2.5 pt-1">
                  <Button
                    variant="brand"
                    label="Collect Payment via QR"
                    onPress={handleCollectPaymentQR}
                    size="lg"
                    className="rounded-2xl"
                    textClassName="font-extrabold text-[15px]"
                  />
                  <AppPressable
                    onPress={markPaymentCollected}
                    className="items-center py-1.5 active:opacity-75"
                  >
                    <AppText className="text-[13px] font-bold text-foreground-secondary">
                      Mark as Cash Received in Hand
                    </AppText>
                  </AppPressable>
                </AppView>
              )
            ) : null}

            <AppText className="text-[14px] leading-5 text-muted">
              Ask Receiver Or Sender to confirm the 4-digit delivery OTP shown in their app.
            </AppText>

            <AppView className="items-center py-1">
              <OtpInput length={4} value={otp} onChange={setOtp} />
            </AppView>

            <AppPressable
              onPress={() =>
                Alert.alert(
                  'OTP Help',
                  'Ask the customer or call dispatch support if OTP cannot be retrieved.',
                )
              }
              className="items-center py-1 active:opacity-70"
            >
              <AppText className="text-[14px] font-semibold text-brand">
                {"Customer can't find the OTP?"}
              </AppText>
            </AppPressable>
          </AppView>

          <AppView className="pt-2">
            <Button
              variant="brand"
              label="Confirm delivery"
              onPress={handleCompleteDelivery}
              size="lg"
              className="rounded-full shadow-lg shadow-brand/25"
              textClassName="font-extrabold text-[16px]"
            />
          </AppView>
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </AppView>
  );
}
