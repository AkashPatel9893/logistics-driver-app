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

export function SetupBankScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const bank = useDriverStore((s) => s.bank);
  const saveBankDetails = useDriverStore((s) => s.saveBankDetails);

  const [holderName, setHolderName] = useState(bank.holderName || 'Rajesh Kumar');
  const [accountNumber, setAccountNumber] = useState(bank.rawAccountNumber || '50100482915849');
  const [confirmAcc, setConfirmAcc] = useState(bank.rawAccountNumber || '50100482915849');
  const [ifscCode, setIfscCode] = useState(bank.ifscCode || 'HDFC0001234');
  const [chequePhoto, setChequePhoto] = useState<string | null>(
    bank.chequeUploaded
      ? 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80'
      : null,
  );

  const handleSave = () => {
    if (!holderName.trim() || !accountNumber.trim() || !ifscCode.trim()) {
      Alert.alert('Required Fields', 'Please fill in all bank details.');
      return;
    }
    if (accountNumber !== confirmAcc) {
      Alert.alert('Mismatch', 'Account number and confirm account number do not match.');
      return;
    }

    saveBankDetails({
      holderName,
      rawAccountNumber: accountNumber,
      accountNumber: `HDFC Bank • •••• ${accountNumber.slice(-4)}`,
      ifscCode: ifscCode.toUpperCase(),
      chequeUploaded: Boolean(chequePhoto),
      verified: true,
    });

    Alert.alert('Bank Account Saved! 🏦', 'Your bank details have been saved for direct payouts.', [
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
            <AppText className="text-[20px] font-black text-foreground">Add Bank Details</AppText>
            <AppText className="text-[12px] text-muted">
              Fast automatic & instant weekly settlements
            </AppText>
          </AppView>
        </AppView>
      </AppView>

      <AppKeyboardAvoidingView>
        <AppScrollView
          contentContainerClassName="px-5 pb-16 pt-4 gap-5"
          showsVerticalScrollIndicator={false}
        >
          {/* Account Holder */}
          <TextField
            variant="outlined"
            label="Account Holder Name"
            required
            value={holderName}
            onChangeText={setHolderName}
            placeholder="As per bank passbook"
            autoCapitalize="words"
            leading={<Icon name="person" size={18} tone="icon-subtle" />}
          />

          {/* Account Number */}
          <TextField
            variant="outlined"
            label="Bank Account Number"
            required
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="Enter account number"
            keyboardType="number-pad"
            leading={<Icon name="banknote" size={18} tone="icon-subtle" />}
          />

          {/* Confirm Account Number */}
          <TextField
            variant="outlined"
            label="Re-enter Account Number"
            required
            value={confirmAcc}
            onChangeText={setConfirmAcc}
            placeholder="Confirm account number"
            keyboardType="number-pad"
            leading={<Icon name="checkmark" size={18} tone="icon-subtle" />}
          />

          {/* IFSC Code */}
          <TextField
            variant="outlined"
            label="IFSC Code"
            required
            value={ifscCode}
            onChangeText={setIfscCode}
            placeholder="e.g. HDFC0001234"
            autoCapitalize="characters"
            leading={<Icon name="tag.fill" size={18} tone="icon-subtle" />}
          />

          {/* Passbook / Cheque Photo */}
          <PhotoUploadBox
            label="Cancelled Cheque or Passbook"
            hint="Upload clear copy showing account number and IFSC"
            photoUri={chequePhoto}
            onSelectPhoto={() =>
              setChequePhoto(
                'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
              )
            }
          />

          {/* Save Button */}
          <AppView className="pt-2">
            <Button
              label="Save Bank Account"
              onPress={handleSave}
              size="lg"
              textClassName="font-extrabold text-base"
            />
          </AppView>
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </AppView>
  );
}
