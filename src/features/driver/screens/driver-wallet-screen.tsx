import { useRouter } from 'expo-router';
import { Alert, RefreshControl } from 'react-native';

import { AppPressable, AppScrollView, AppSpinner, AppText, AppView, Icon } from '@/components/ui';
import { useDriverProfile } from '@/hooks/use-driver';
import { usePayouts, useRequestPayout, useWallet } from '@/hooks/use-earnings';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { getErrorMessage } from '@/lib/api/api-error';
import type { DriverTransaction } from '@/lib/api/models';
import { formatDayTime, formatRupees } from '@/lib/format';

import { SetupScreenLayout } from '../components/setup-screen-layout';

function TransactionRow({ txn }: { txn: DriverTransaction }) {
  const isCredit = txn.amount >= 0;
  return (
    <AppView className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-3.5 shadow-sm">
      <AppView row className="flex-1 items-center gap-3">
        <AppView
          className={`h-10 w-10 items-center justify-center rounded-xl ${isCredit ? 'bg-emerald-500/10' : 'bg-neutral-500/10'}`}
        >
          <Icon
            name={isCredit ? 'arrow.down.left' : 'arrow.up.right'}
            size={16}
            color={isCredit ? '#10b981' : '#6b7280'}
          />
        </AppView>
        <AppView className="flex-1 pr-2">
          <AppText className="text-[14px] font-bold text-foreground" numberOfLines={1}>
            {txn.title}
          </AppText>
          <AppText className="text-[11px] text-muted">{formatDayTime(txn.createdAt)}</AppText>
        </AppView>
      </AppView>
      <AppText
        className={`text-[15px] font-black ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}
      >
        {isCredit ? '+' : ''}
        {formatRupees(txn.amount)}
      </AppText>
    </AppView>
  );
}

export function DriverWalletScreen() {
  const router = useRouter();
  const walletQuery = useWallet();
  const { refreshing, refresh } = usePullToRefresh();
  const wallet = walletQuery.data;
  const { data: profile } = useDriverProfile();
  const payout = useRequestPayout();
  const payouts = usePayouts();
  const bankVerified = profile?.bank?.status === 'verified';

  const handleWithdraw = () => {
    if (!wallet) return;
    if (!bankVerified) {
      Alert.alert('Bank account needed', 'Add and verify a bank account to withdraw.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Add bank', onPress: () => router.push('/setup-bank') },
      ]);
      return;
    }
    if (wallet.balance <= 0) {
      Alert.alert('Balance too low', 'You need a positive balance to withdraw.');
      return;
    }
    Alert.alert(
      'Withdraw to bank',
      `Transfer ${formatRupees(wallet.balance)} to your verified bank account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          onPress: () =>
            payout.mutate(wallet.balance, {
              onSuccess: () =>
                Alert.alert('Withdrawal initiated', 'Your withdrawal request was submitted.'),
              onError: (e) => Alert.alert('Withdrawal failed', getErrorMessage(e)),
            }),
        },
      ],
    );
  };

  return (
    <SetupScreenLayout title="Wallet" subtitle="Earnings, incentives and payouts">
      <AppScrollView
        contentContainerClassName="gap-5 px-5 pb-16 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh(() => walletQuery.refetch({ throwOnError: true }))}
          />
        }
      >
        <AppView className="overflow-hidden rounded-3xl bg-neutral-950 p-6 shadow-xl dark:border dark:border-neutral-800">
          <AppText className="text-[13px] font-semibold text-neutral-400">Wallet balance</AppText>
          <AppText className="mt-1 text-[36px] font-black text-white">
            {wallet ? formatRupees(wallet.balance) : '—'}
          </AppText>
          {wallet && wallet.balance < 0 ? (
            <AppText className="mt-1 text-[12px] text-amber-300">
              Cash commission due. It is settled from your next online-paid trips.
            </AppText>
          ) : null}

          <AppView row className="mt-6 gap-3">
            <AppPressable
              onPress={handleWithdraw}
              disabled={payout.isPending || !wallet}
              pressScale={0.95}
              className="flex-1 items-center justify-center rounded-2xl bg-brand py-3.5 shadow-md active:bg-brand/90"
            >
              <AppText className="text-[14px] font-black text-white">
                {payout.isPending ? 'Processing…' : 'Withdraw to bank'}
              </AppText>
            </AppPressable>
            <AppPressable
              onPress={() => router.push('/earnings')}
              pressScale={0.95}
              className="flex-1 items-center justify-center rounded-2xl bg-neutral-800 py-3.5 active:bg-neutral-700"
            >
              <AppText className="text-[14px] font-bold text-white">Earnings</AppText>
            </AppPressable>
          </AppView>
        </AppView>

        <AppView className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <AppView row className="mb-3 items-center justify-between">
            <AppText className="text-[15px] font-extrabold text-foreground">Payout account</AppText>
            <AppPressable onPress={() => router.push('/setup-bank')}>
              <AppText className="text-[12px] font-bold text-brand">
                {profile?.bank ? 'Change' : 'Add'}
              </AppText>
            </AppPressable>
          </AppView>
          <AppView className="flex-row items-center justify-between rounded-2xl border border-border/80 bg-surface-muted p-3.5">
            <AppView row className="flex-1 items-center gap-3">
              <AppView className="h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                <Icon name="banknote" size={20} tone="brand" />
              </AppView>
              <AppText className="flex-1 text-[14px] font-bold text-foreground">
                {profile?.bank
                  ? `${profile.bank.bankName} · ${profile.bank.accountLast4}`
                  : 'No bank account yet'}
              </AppText>
            </AppView>
            {profile?.bank ? (
              <AppView
                className={`rounded-full px-2.5 py-0.5 ${bankVerified ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}
              >
                <AppText
                  className={`text-[10px] font-black ${bankVerified ? 'text-emerald-600' : 'text-amber-700'}`}
                >
                  {bankVerified ? 'VERIFIED' : 'IN REVIEW'}
                </AppText>
              </AppView>
            ) : null}
          </AppView>
        </AppView>

        <AppView className="gap-3">
          <AppText className="px-1 text-[16px] font-extrabold text-foreground">Payouts</AppText>
          {payouts.isPending ? (
            <AppSpinner />
          ) : payouts.isError ? (
            <AppPressable
              onPress={() => void payouts.refetch()}
              className="min-h-11 justify-center"
            >
              <AppText className="text-muted">Could not load payouts. Tap to retry.</AppText>
            </AppPressable>
          ) : payouts.data.length === 0 ? (
            <AppText className="text-[13px] text-muted">No payouts yet.</AppText>
          ) : (
            payouts.data.map((item) => (
              <AppView key={item.id} className="rounded-2xl border border-border bg-card p-4">
                <AppView row className="justify-between">
                  <AppText className="font-bold text-foreground">
                    {formatRupees(Number(item.net_amount))}
                  </AppText>
                  <AppText className="font-semibold text-foreground">
                    {(
                      {
                        CREATED: 'Requested',
                        PROCESSING: 'Processing',
                        PAID: 'Paid',
                        FAILED: 'Failed',
                        NEEDS_ATTENTION: 'Needs attention',
                        REVERSED: 'Reversed',
                      } as Record<string, string>
                    )[item.status] ?? item.status}
                  </AppText>
                </AppView>
                <AppText className="mt-1 text-[12px] text-muted">
                  {item.payout_reference} · {item.paid_at ? 'Paid' : 'Period ending'}{' '}
                  {formatDayTime(item.paid_at ?? item.period_end)}
                </AppText>
              </AppView>
            ))
          )}
        </AppView>

        <AppView className="gap-3">
          <AppText className="px-1 text-[16px] font-extrabold text-foreground">
            Transactions
          </AppText>
          {walletQuery.isLoading ? <AppSpinner /> : null}
          {walletQuery.isError ? (
            <AppText className="text-muted">Could not load wallet. Pull to retry.</AppText>
          ) : null}
          {wallet && wallet.transactions.length === 0 ? (
            <AppView className="items-center rounded-2xl border border-dashed border-border p-6">
              <AppText className="text-center text-[13px] text-muted">
                No transactions yet. Trip earnings, incentives and payouts will show here.
              </AppText>
            </AppView>
          ) : null}
          {wallet?.transactions.map((txn) => (
            <TransactionRow key={txn.id} txn={txn} />
          ))}
        </AppView>
      </AppScrollView>
    </SetupScreenLayout>
  );
}
