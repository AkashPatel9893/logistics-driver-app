import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
} from '@/components/ui';
import { useDriverStore } from '@/stores/driver-store';

interface Transaction {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: 'credit' | 'debit';
  method: string;
}

const TRANSACTIONS: Transaction[] = [
  {
    id: 'tx1',
    title: 'Trip Payout #MV-2048',
    date: 'Today, 02:45 PM',
    amount: 524,
    type: 'credit',
    method: 'Trip Fare',
  },
  {
    id: 'tx2',
    title: 'Daily Selfie Check Bonus',
    date: 'Today, 08:30 AM',
    amount: 50,
    type: 'credit',
    method: 'Incentive',
  },
  {
    id: 'tx3',
    title: 'Instant Payout to Bank',
    date: 'Yesterday, 06:12 PM',
    amount: 2500,
    type: 'debit',
    method: 'HDFC Bank Payout',
  },
  {
    id: 'tx4',
    title: 'Trip Payout #MV-1992',
    date: 'Yesterday, 04:20 PM',
    amount: 480,
    type: 'credit',
    method: 'Trip Fare',
  },
];

export function DriverWalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const walletBalance = useDriverStore((s) => s.walletBalance);
  const withdrawBalance = useDriverStore((s) => s.withdrawBalance);
  const bank = useDriverStore((s) => s.bank);

  const [isProcessing, setIsProcessing] = useState(false);

  const handleWithdraw = () => {
    if (walletBalance <= 0) {
      Alert.alert('Zero Balance', 'No funds available to withdraw at this time.');
      return;
    }

    Alert.alert(
      'Confirm Bank Withdrawal',
      `Transfer ₹${walletBalance.toLocaleString('en-IN')} to your verified ${bank.accountNumber || 'HDFC Bank'} account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw Now',
          style: 'default',
          onPress: () => {
            setIsProcessing(true);
            setTimeout(() => {
              withdrawBalance();
              setIsProcessing(false);
              Alert.alert(
                'Withdrawal Initiated! 🏦',
                'Funds will reflect in your bank account within 2 hours.',
              );
            }, 600);
          },
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
            <AppText className="text-[20px] font-black text-foreground">Driver Wallet</AppText>
            <AppText className="text-[12px] text-muted">
              Instant payouts & earnings management
            </AppText>
          </AppView>
        </AppView>
      </AppView>

      <AppScrollView
        contentContainerClassName="px-5 pb-16 pt-4 gap-5"
        showsVerticalScrollIndicator={false}
      >
        {/* Wallet Balance Card */}
        <AppView className="overflow-hidden rounded-3xl bg-neutral-950 p-6 shadow-xl dark:border dark:border-neutral-800">
          <AppView row className="items-center justify-between">
            <AppView>
              <AppText className="text-[13px] font-semibold text-neutral-400">
                Total Wallet Balance
              </AppText>
              <AppText className="mt-1 text-[36px] font-black text-white">
                ₹{walletBalance.toLocaleString('en-IN')}
              </AppText>
            </AppView>
            <AppView className="h-12 w-12 items-center justify-center rounded-2xl bg-brand/20">
              <Icon name="banknote" size={24} color="#ff5a1f" />
            </AppView>
          </AppView>

          <AppView row className="mt-6 gap-3">
            <AppPressable
              onPress={handleWithdraw}
              disabled={isProcessing}
              pressScale={0.95}
              className="flex-1 items-center justify-center rounded-2xl bg-brand py-3.5 shadow-md active:bg-brand/90"
            >
              <AppText className="text-[14px] font-black text-white">
                {isProcessing ? 'Processing...' : 'Withdraw to Bank'}
              </AppText>
            </AppPressable>

            <AppPressable
              onPress={() => router.push('/earnings')}
              pressScale={0.95}
              className="flex-1 items-center justify-center rounded-2xl bg-neutral-800 py-3.5 active:bg-neutral-700"
            >
              <AppText className="text-[14px] font-bold text-white">Earnings Stats</AppText>
            </AppPressable>
          </AppView>
        </AppView>

        {/* Linked Accounts */}
        <AppView className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <AppView row className="items-center justify-between mb-3">
            <AppText className="text-[15px] font-extrabold text-foreground">Payout Methods</AppText>
            <AppPressable onPress={() => router.push('/setup-bank')}>
              <AppText className="text-[12px] font-bold text-brand">Edit</AppText>
            </AppPressable>
          </AppView>

          {/* Primary Bank */}
          <AppPressable
            onPress={() => router.push('/setup-bank')}
            className="flex-row items-center justify-between rounded-2xl border border-border/80 bg-surface-muted p-3.5"
          >
            <AppView row className="items-center gap-3">
              <AppView className="h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                <Icon name="banknote" size={20} tone="brand" />
              </AppView>
              <AppView>
                <AppText className="text-[14px] font-bold text-foreground">
                  {bank.accountNumber || 'HDFC Bank • •••• 5849'}
                </AppText>
                <AppText className="text-[11px] text-muted">Primary payout destination</AppText>
              </AppView>
            </AppView>

            <AppView className="rounded-full bg-emerald-500/15 px-2.5 py-0.5">
              <AppText className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                VERIFIED
              </AppText>
            </AppView>
          </AppPressable>
        </AppView>

        {/* Recent Transactions */}
        <AppView className="gap-3">
          <AppText className="text-[16px] font-extrabold text-foreground px-1">
            Recent Transactions
          </AppText>

          {TRANSACTIONS.map((tx) => (
            <AppView
              key={tx.id}
              className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-3.5 shadow-sm"
            >
              <AppView row className="items-center gap-3">
                <AppView
                  className={`h-10 w-10 items-center justify-center rounded-xl ${
                    tx.type === 'credit'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-neutral-500/10 text-neutral-600'
                  }`}
                >
                  <Icon
                    name={tx.type === 'credit' ? 'arrow.right' : 'arrow.right'}
                    size={16}
                    color={tx.type === 'credit' ? '#10b981' : '#6b7280'}
                  />
                </AppView>
                <AppView>
                  <AppText className="text-[14px] font-bold text-foreground">{tx.title}</AppText>
                  <AppText className="text-[11px] text-muted">
                    {tx.date} • {tx.method}
                  </AppText>
                </AppView>
              </AppView>

              <AppText
                className={`text-[15px] font-black ${
                  tx.type === 'credit'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-foreground'
                }`}
              >
                {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
              </AppText>
            </AppView>
          ))}
        </AppView>
      </AppScrollView>
    </AppView>
  );
}
