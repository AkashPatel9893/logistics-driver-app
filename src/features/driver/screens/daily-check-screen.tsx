import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppScrollView,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
} from '@/components/ui';
import { useDriverStore } from '@/stores/driver-store';

import { PhotoUploadBox } from '../components/photo-upload-box';

export function DailyCheckScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const dailyCheck = useDriverStore((s) => s.dailyCheck);
  const completeDailyCheck = useDriverStore((s) => s.completeDailyCheck);

  const [photoUri, setPhotoUri] = useState<string | null>(
    dailyCheck.photoUri ||
      'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
  );

  const handleSelectPhoto = () => {
    const sample =
      'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80';
    setPhotoUri(sample);
  };

  const handleSubmit = () => {
    if (!photoUri) {
      Alert.alert('Photo Required', 'Please take or upload your daily vehicle selfie to continue.');
      return;
    }
    completeDailyCheck(photoUri);
    Alert.alert(
      'Verification Successful! 🎉',
      '₹50 daily bonus has been credited to your wallet balance.',
      [
        {
          text: 'Back to Dashboard',
          onPress: () => router.replace('/home'),
        },
      ],
    );
  };

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />

      {/* Top Header */}
      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        className="border-b border-border/80 bg-card px-5 pb-3.5 shadow-sm"
      >
        <AppView row className="items-center gap-3">
          <LiquidGlassBackButton onPress={() => router.back()} />
          <AppView>
            <AppText className="text-[18px] font-black text-foreground">
              Daily Photo Verification
            </AppText>
            <AppText className="text-[12px] text-muted">Safety check & daily instant bonus</AppText>
          </AppView>
        </AppView>
      </AppView>

      <AppScrollView
        contentContainerClassName="px-5 pb-12 pt-4 gap-5"
        showsVerticalScrollIndicator={false}
      >
        {/* Bonus Highlight Card */}
        <AppView className="overflow-hidden rounded-3xl border border-brand/30 bg-brand/10 p-5">
          <AppView row className="items-center justify-between">
            <AppView>
              <AppText className="text-[12px] font-bold uppercase tracking-wider text-brand">
                DAILY INCENTIVE
              </AppText>
              <AppText className="mt-0.5 text-[22px] font-black text-foreground">
                Earn ₹50 Instant Bonus
              </AppText>
            </AppView>
            <AppView className="h-12 w-12 items-center justify-center rounded-2xl bg-brand">
              <Icon name="camera" size={24} color="#ffffff" />
            </AppView>
          </AppView>
          <AppText className="mt-2 text-[13px] leading-5 text-muted">
            Submit a clear selfie with your vehicle front and number plate visible before starting
            your shift today.
          </AppText>
        </AppView>

        {/* Verification Guidelines */}
        <AppView className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <AppText className="text-[15px] font-bold text-foreground">Photo Guidelines</AppText>

          <AppView className="mt-3 gap-2.5">
            {[
              'Stand in front of your vehicle with face visible',
              'Vehicle number plate must be clear and readable',
              'Take photo in good natural daylight',
              'Ensure vehicle is clean and ready for goods transport',
            ].map((rule, idx) => (
              <AppView key={idx} row className="items-start gap-2.5">
                <AppView className="mt-1 h-2 w-2 rounded-full bg-brand" />
                <AppText className="flex-1 text-[13px] text-foreground-secondary">{rule}</AppText>
              </AppView>
            ))}
          </AppView>
        </AppView>

        {/* Photo Upload Box */}
        <PhotoUploadBox
          label="Your Vehicle Selfie"
          hint="Tap to take or upload shift verification selfie"
          photoUri={photoUri}
          onSelectPhoto={handleSelectPhoto}
        />

        {/* Submit Button */}
        <AppView className="pt-2">
          <Button
            label={dailyCheck.completed ? 'Photo Verified ✓' : 'Submit & Claim ₹50 Bonus'}
            onPress={handleSubmit}
            size="lg"
            textClassName="font-extrabold text-base"
          />
        </AppView>
      </AppScrollView>
    </AppView>
  );
}
