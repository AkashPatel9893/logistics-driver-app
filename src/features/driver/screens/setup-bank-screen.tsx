import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import {
  AppKeyboardAvoidingView,
  AppScrollView,
  AppText,
  Button,
  Icon,
  TextField,
} from '@/components/ui';
import { useDriverProfile, useSaveBank } from '@/hooks/use-driver';
import { getErrorMessage } from '@/lib/api/api-error';

import { PhotoUploadBox } from '../components/photo-upload-box';
import { SetupScreenLayout } from '../components/setup-screen-layout';
import { usePhotoUpload } from '../hooks/use-photo-upload';

export function SetupBankScreen() {
  const router = useRouter();
  const { data: profile } = useDriverProfile();
  const saveBank = useSaveBank();
  const current = profile?.bank ?? null;

  const [holderName, setHolderName] = useState(current?.holderName ?? profile?.name ?? '');
  // The full account number is never sent back to the app; re-enter to change it.
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifscCode, setIfscCode] = useState(current?.ifscCode ?? '');
  const cheque = usePhotoUpload('bank_cheque', current?.chequePhotoUrl ?? null, 'document');
  const [error, setError] = useState<string>();

  const handleSave = () => {
    if (accountNumber !== confirmAccount) return setError('Account numbers do not match.');
    if (!cheque.url) return setError('Add a photo of a cancelled cheque or passbook.');
    setError(undefined);
    saveBank.mutate(
      { holderName, accountNumber, ifscCode, chequePhotoUrl: cheque.url },
      {
        onSuccess: (updated) =>
          Alert.alert(
            'Bank account submitted',
            `${updated.bank?.bankName ?? 'Your bank'} •• ${updated.bank?.accountLast4 ?? ''} will be verified shortly.`,
            [{ text: 'OK', onPress: () => router.back() }],
          ),
        onError: (e) => setError(getErrorMessage(e)),
      },
    );
  };

  return (
    <SetupScreenLayout title="Bank details" subtitle="Wallet payouts go to this account">
      <AppKeyboardAvoidingView>
        <AppScrollView
          contentContainerClassName="gap-5 px-5 pb-16 pt-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {current ? (
            <AppText className="text-[13px] text-muted">
              Current: {current.bankName} •• {current.accountLast4}. Enter the account again to
              change it.
            </AppText>
          ) : null}

          <TextField
            variant="outlined"
            label="Account holder name"
            required
            value={holderName}
            onChangeText={setHolderName}
            placeholder="As printed on your passbook"
            autoCapitalize="words"
            leading={<Icon name="person" size={18} tone="icon-subtle" />}
          />

          <TextField
            variant="outlined"
            label="Account number"
            required
            value={accountNumber}
            onChangeText={(t) => setAccountNumber(t.replace(/\D/g, ''))}
            placeholder="9–18 digits"
            keyboardType="number-pad"
            maxLength={18}
            secureTextEntry
            leading={<Icon name="banknote" size={18} tone="icon-subtle" />}
          />

          <TextField
            variant="outlined"
            label="Confirm account number"
            required
            value={confirmAccount}
            onChangeText={(t) => setConfirmAccount(t.replace(/\D/g, ''))}
            placeholder="Re-enter account number"
            keyboardType="number-pad"
            maxLength={18}
            leading={<Icon name="checkmark" size={18} tone="icon-subtle" />}
          />

          <TextField
            variant="outlined"
            label="IFSC code"
            required
            value={ifscCode}
            onChangeText={(t) => setIfscCode(t.toUpperCase())}
            placeholder="HDFC0001234"
            autoCapitalize="characters"
            maxLength={11}
            leading={<Icon name="tag.fill" size={18} tone="icon-subtle" />}
          />

          <PhotoUploadBox
            label="Cancelled cheque or passbook"
            title="Add cheque photo"
            hint="Account number and IFSC must be visible"
            photoUri={cheque.previewUri}
            uploading={cheque.uploading}
            error={cheque.error}
            onSelectPhoto={cheque.pick}
          />

          {error ? <AppText className="text-[13px] font-medium text-error">{error}</AppText> : null}

          <Button
            label={current ? 'Update bank account' : 'Submit bank account'}
            onPress={handleSave}
            loading={saveBank.isPending}
            disabled={cheque.uploading}
            size="lg"
            textClassName="font-extrabold text-base"
          />
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </SetupScreenLayout>
  );
}
