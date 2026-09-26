import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppKeyboardAvoidingView,
  AppScrollView,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
  TextField,
} from '@/components/ui';
import { useDriverStore } from '@/stores/driver-store';

import { PhotoUploadBox } from '../components/photo-upload-box';

export function SetupKycScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const kyc = useDriverStore((s) => s.kyc);
  const saveKycDetails = useDriverStore((s) => s.saveKycDetails);

  const [panNumber, setPanNumber] = useState(kyc.panNumber || 'ABCDE1234F');
  const [dlNumber, setDlNumber] = useState(kyc.dlNumber || 'DL-042019003412');
  const [dlPhoto, setDlPhoto] = useState<string | null>(
    kyc.dlUploaded
      ? 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80'
      : null,
  );
  const [aadhaarPhoto, setAadhaarPhoto] = useState<string | null>(
    kyc.aadhaarUploaded
      ? 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
      : null,
  );

  const handleSubmit = () => {
    if (!panNumber.trim() || !dlNumber.trim()) {
      Alert.alert('Required Fields', 'Please enter your PAN and Driving License numbers.');
      return;
    }

    saveKycDetails({
      panNumber: panNumber.toUpperCase(),
      dlNumber: dlNumber.toUpperCase(),
      dlUploaded: Boolean(dlPhoto),
      aadhaarUploaded: Boolean(aadhaarPhoto),
      verified: true,
    });

    Alert.alert('KYC Submitted! 📄', 'Your documents have been submitted and verified.', [
      { text: 'Done', onPress: () => router.back() },
    ]);
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
            <AppText className="text-[20px] font-black text-foreground">KYC Verification</AppText>
            <AppText className="text-[12px] text-muted">
              Submit identity & driving credentials
            </AppText>
          </AppView>
        </AppView>
      </AppView>

      <AppKeyboardAvoidingView>
        <AppScrollView
          contentContainerClassName="px-5 pb-16 pt-4 gap-5"
          showsVerticalScrollIndicator={false}
        >
          {/* PAN Card */}
          <TextField
            variant="outlined"
            label="PAN Card Number"
            required
            value={panNumber}
            onChangeText={setPanNumber}
            placeholder="e.g. ABCDE1234F"
            autoCapitalize="characters"
            leading={<Icon name="checkmark.shield.fill" size={18} tone="icon-subtle" />}
          />

          {/* DL Number */}
          <TextField
            variant="outlined"
            label="Driving License Number"
            required
            value={dlNumber}
            onChangeText={setDlNumber}
            placeholder="e.g. DL-042019003412"
            autoCapitalize="characters"
            leading={<Icon name="document" size={18} tone="icon-subtle" />}
          />

          {/* DL Photo Upload */}
          <PhotoUploadBox
            label="Driving License Photo (Front & Back)"
            hint="Ensure name and validity date are clearly readable"
            photoUri={dlPhoto}
            onSelectPhoto={() =>
              setDlPhoto(
                'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
              )
            }
          />

          {/* Aadhaar Photo Upload */}
          <PhotoUploadBox
            label="Aadhaar Card Photo"
            hint="Upload front copy with visible address and photo"
            photoUri={aadhaarPhoto}
            onSelectPhoto={() =>
              setAadhaarPhoto(
                'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
              )
            }
          />

          {/* Submit Button */}
          <AppView className="pt-2">
            <Button
              label="Submit KYC Documents"
              onPress={handleSubmit}
              size="lg"
              textClassName="font-extrabold text-base"
            />
          </AppView>
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </AppView>
  );
}
