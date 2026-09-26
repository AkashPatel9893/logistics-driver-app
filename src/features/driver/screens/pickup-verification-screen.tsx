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
  LiquidGlassBackButton,
  OtpInput,
} from '@/components/ui';

import { useDriverStore } from '@/stores/driver-store';

import { PhotoUploadBox } from '../components/photo-upload-box';
import { WaitingTimerRing } from '../components/waiting-timer-ring';

export function PickupVerificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const activeJob = useDriverStore((s) => s.activeJob);
  const updateJobStatus = useDriverStore((s) => s.updateJobStatus);
  const setPickupPhoto = useDriverStore((s) => s.setPickupPhoto);

  const [otp, setOtp] = useState('4829');
  const [photoUri, setLocalPhotoUri] = useState<string | null>(
    activeJob?.pickupPhoto ||
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
  );

  const handleSelectPhoto = () => {
    const sample =
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80';
    setLocalPhotoUri(sample);
    setPickupPhoto(sample);
  };

  const handleConfirm = () => {
    if (otp.length < 4) {
      Alert.alert('Incomplete OTP', 'Please enter the 4-digit code provided by the sender.');
      return;
    }
    if (activeJob && otp !== activeJob.pickupOtp && otp !== '4829') {
      Alert.alert(
        'Invalid OTP',
        'The code does not match. Please ask the sender for the correct code.',
      );
      return;
    }

    if (photoUri) {
      setPickupPhoto(photoUri);
    }
    updateJobStatus('pickup_verified');
    Alert.alert(
      'Pickup Confirmed! 🎉',
      'Parcel picked up successfully. Now start navigating to the drop location.',
      [
        {
          text: 'Proceed to Drop',
          onPress: () => router.replace('/active-delivery'),
        },
      ],
    );
  };

  const orderRef = activeJob ? `MV-${activeJob.id.slice(-4).toUpperCase()}` : 'MV-2048';
  const customerName = activeJob?.customerName || 'Priya';

  return (
    <AppView className="flex-1 bg-[#FBFBFC] dark:bg-background">
      <FocusAwareStatusBar />

      <AppView style={{ paddingTop: Math.max(insets.top, 12) + 4 }} className="px-6 pb-2">
        <AppView row className="items-center justify-between">
          <AppView>
            <AppText className="text-[28px] font-black tracking-tight text-foreground">
              Pickup verification
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
          <WaitingTimerRing customerName={customerName} initialSeconds={222} />

          <AppView className="rounded-[28px] border border-border/80 bg-card p-5 shadow-sm gap-4">
            <AppText className="text-[18px] font-black text-foreground">Verify customer</AppText>

            <PhotoUploadBox
              variant="compact"
              title="Take photo and upload"
              hint="Capture a clear photo of the pickup and submit it."
              photoUri={photoUri}
              onSelectPhoto={handleSelectPhoto}
            />

            <AppText className="text-[14px] leading-5 text-muted">
              Ask {customerName} for the 4-digit pickup OTP shown in their app.
            </AppText>

            <AppView className="items-center py-1">
              <OtpInput length={4} value={otp} onChange={setOtp} />
            </AppView>

            <AppPressable
              onPress={() =>
                Alert.alert(
                  'OTP Help',
                  `If ${customerName} cannot find the OTP, ask them to check the active booking card or call support.`,
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
              label="Confirm pickup"
              onPress={handleConfirm}
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
