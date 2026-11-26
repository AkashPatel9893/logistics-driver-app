import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import {
  AppKeyboardAvoidingView,
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Button,
  Icon,
  TextField,
} from '@/components/ui';
import { useDriverProfile, useSaveBank } from '@/hooks/use-driver';
import { getErrorMessage } from '@/lib/api/api-error';
import type { DriverProfile } from '@/lib/api/models';

import { SetupScreenLayout } from '../components/setup-screen-layout';
import { goToNextStep } from '@/features/registration/next-step';

const STATUS_LABEL = {
  verified: 'Verified',
  under_review: 'In review',
  rejected: 'Rejected',
} as const;
const STATUS_STYLE = {
  verified: 'bg-emerald-500/15 text-emerald-700',
  under_review: 'bg-amber-500/15 text-amber-700',
  rejected: 'bg-red-500/15 text-red-700',
} as const;

function SavedRow({ label, value }: { label: string; value: string }) {
  return (
    <AppView row className="items-center justify-between gap-4 border-t border-border/60 py-3">
      <AppText className="text-[13px] text-muted">{label}</AppText>
      <AppText className="flex-1 text-right text-[14px] font-bold text-foreground">{value}</AppText>
    </AppView>
  );
}

/** Waits for the saved details, so the form never opens empty while they are still loading. */
export function SetupBankScreen() {
  const { data: profile, isLoading } = useDriverProfile();
  if (!profile) {
    return (
      <SetupScreenLayout title="Bank details" subtitle="Wallet payouts go to this account">
        <AppView className="flex-1 items-center justify-center p-6">
          {isLoading ? (
            <AppSpinner size="large" />
          ) : (
            <AppText className="text-muted">Could not load your bank details.</AppText>
          )}
        </AppView>
      </SetupScreenLayout>
    );
  }
  return <SetupBankForm profile={profile} />;
}

function SetupBankForm({ profile }: { profile: DriverProfile }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const saveBank = useSaveBank();
  const current = profile.bank ?? null;
  // A saved account is shown as a summary first; the form opens only to change it.
  const [changing, setChanging] = useState(current === null);

  const [holderName, setHolderName] = useState(current?.holderName ?? profile.name ?? '');
  // The full account number is never sent back to the app; re-enter to change it.
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifscCode, setIfscCode] = useState(current?.ifscCode ?? '');
  const [error, setError] = useState<string>();

  const handleSave = () => {
    if (accountNumber !== confirmAccount) return setError('Account numbers do not match.');
    if (!/^\d{6,18}$/.test(accountNumber)) return setError('Enter a valid account number.');
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) return setError('Enter a valid IFSC code.');
    setError(undefined);
    saveBank.mutate(
      { holderName, accountNumber, ifscCode },
      {
        onSuccess: (updated) => {
          const last4 = updated.bank?.accountLast4 ?? '';
          // Saved but refused by the bank check: stay here so it can be corrected.
          if (updated.bank?.status === 'rejected') {
            setError(
              `The account ending ${last4} could not be verified. Check the account number and IFSC code, then submit again.`,
            );
            return;
          }
          Alert.alert('Bank account submitted', `Account ending ${last4} has been added.`, [
            { text: 'OK', onPress: () => goToNextStep(router, queryClient, 'bank') },
          ]);
        },
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
            <AppView className="rounded-3xl border border-border bg-card px-5 pb-2 pt-4">
              <AppView row className="items-center justify-between pb-3">
                <AppText className="text-[16px] font-extrabold text-foreground">
                  Saved bank account
                </AppText>
                <AppView
                  className={`rounded-full px-3 py-1 ${STATUS_STYLE[current.status].split(' ')[0]}`}
                >
                  <AppText
                    className={`text-[12px] font-bold ${STATUS_STYLE[current.status].split(' ')[1]}`}
                  >
                    {STATUS_LABEL[current.status]}
                  </AppText>
                </AppView>
              </AppView>
              <SavedRow label="Bank" value={current.bankName} />
              <SavedRow label="Account holder" value={current.holderName} />
              <SavedRow label="Account number" value={`•••• ${current.accountLast4}`} />
              <SavedRow label="IFSC" value={current.ifscCode} />
            </AppView>
          ) : null}
          {current && !changing ? (
            <>
              <AppText className="px-1 text-[12px] leading-5 text-muted">
                For your security the full account number is never shown again.
              </AppText>
              <Button
                label="Change bank account"
                variant="outline"
                onPress={() => setChanging(true)}
                size="lg"
              />
            </>
          ) : null}

          {changing ? (
            <>
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
                hint={
                  current
                    ? `Enter the full number. The saved account ends ${current.accountLast4}.`
                    : undefined
                }
                value={accountNumber}
                onChangeText={(t) => setAccountNumber(t.replace(/\D/g, ''))}
                placeholder="6–18 digits"
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

              {error ? (
                <AppText className="text-[13px] font-medium text-error">{error}</AppText>
              ) : null}

              <Button
                label={current ? 'Update bank account' : 'Submit bank account'}
                onPress={handleSave}
                loading={saveBank.isPending}
                size="lg"
                textClassName="font-extrabold text-base"
              />

              {current ? (
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => setChanging(false)}
                  size="lg"
                />
              ) : null}
            </>
          ) : null}
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </SetupScreenLayout>
  );
}
