import { useRouter } from 'expo-router';
import { Alert, RefreshControl } from 'react-native';

import { AppPressable, AppScrollView, AppSpinner, AppText, AppView, Icon } from '@/components/ui';
import { useDriverProfile } from '@/hooks/use-driver';
import { useRequestPayout, useWallet } from '@/hooks/use-earnings';
import { getErrorMessage } from '@/lib/api/api-error';
import type { DriverTransaction } from '@/lib/api/models';
import { formatDayTime, formatRupees } from '@/lib/format';

import { SetupScreenLayout } from '../components/setup-screen-layout';

const KIND_LABEL: Record<DriverTransaction['kind'], string> = {
  trip_earning: 'Trip earning',
  cash_commission: 'Commission',
  incentive: 'Incentive',
  bonus: 'Bonus',
  payout: 'Bank payout',
};

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
          <AppText className="text-[11px] text-muted">
            {formatDayTime(txn.createdAt)} · {KIND_LABEL[txn.kind]}
          </AppText>
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
  const wallet = walletQuery.data;
  const { data: profile } = useDriverProfile();
  const payout = useRequestPayout();
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
    if (wallet.balance < wallet.minPayout) {
      Alert.alert(
        'Balance too low',
        `You can withdraw once you have ${formatRupees(wallet.minPayout)}.`,
      );
      return;
    }
    Alert.alert(
      'Withdraw to bank',
      `Transfer ${formatRupees(wallet.balance)} to ${wallet.bankLabel}? It reaches your account within 2 hours.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          onPress: () =>
            payout.mutate(wallet.balance, {
              onSuccess: () => Alert.alert('Withdrawal initiated', `Sent to ${wallet.bankLabel}.`),
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
          <RefreshControl refreshing={walletQuery.isRefetching} onRefresh={walletQuery.refetch} />
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
                {wallet?.bankLabel ?? 'No bank account yet'}
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
          <AppText className="px-1 text-[16px] font-extrabold text-foreground">
            Transactions
          </AppText>
          {walletQuery.isLoading ? <AppSpinner /> : null}
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
