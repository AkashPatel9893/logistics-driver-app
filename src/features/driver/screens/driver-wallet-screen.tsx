import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl } from 'react-native';

import {
  AppPressable,
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Icon,
  OptionSheet,
} from '@/components/ui';
import { useDriverProfile } from '@/hooks/use-driver';
import { usePayouts, useRequestPayout, useWallet } from '@/hooks/use-earnings';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { getErrorMessage } from '@/lib/api/api-error';
import type { DriverTransaction } from '@/lib/api/models';
import { formatDayTime, formatRupees } from '@/lib/format';

import { SetupScreenLayout } from '../components/setup-screen-layout';

type WalletView = 'all' | 'pending' | 'payouts';
type TxnFilter = 'all' | 'in' | 'out';

const VIEWS: { value: WalletView; label: string }[] = [
  { value: 'all', label: 'All transactions' },
  { value: 'pending', label: 'Pending' },
  { value: 'payouts', label: 'Payouts' },
];

const FILTER_OPTIONS: { value: TxnFilter; label: string }[] = [
  { value: 'all', label: 'All transactions' },
  { value: 'in', label: 'Money in' },
  { value: 'out', label: 'Money out' },
];

const PAYOUT_STATUS: Record<string, string> = {
  CREATED: 'Requested',
  PROCESSING: 'Processing',
  PAID: 'Paid',
  FAILED: 'Failed',
  NEEDS_ATTENTION: 'Needs attention',
  REVERSED: 'Reversed',
};

function PayoutList({
  items,
  loading,
  error,
  onRetry,
  emptyText,
}: {
  items: {
    id: string;
    net_amount: string;
    status: string;
    payout_reference: string;
    paid_at: string | null;
    period_end: string;
  }[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  emptyText: string;
}) {
  if (loading) return <AppSpinner />;
  if (error) {
    return (
      <AppPressable onPress={onRetry} className="min-h-11 justify-center">
        <AppText className="text-muted">Could not load transfers. Tap to retry.</AppText>
      </AppPressable>
    );
  }
  if (items.length === 0) {
    return (
      <AppView className="items-center gap-2 py-8">
        <Icon name="banknote" size={30} tone="icon-subtle" />
        <AppText className="text-center text-[13px] text-muted">{emptyText}</AppText>
      </AppView>
    );
  }
  return (
    <>
      {items.map((item) => (
        <AppView key={item.id} className="rounded-2xl border border-border bg-card p-4">
          <AppView row className="justify-between">
            <AppText className="font-bold text-foreground">
              {formatRupees(Number(item.net_amount))}
            </AppText>
            <AppText className="font-semibold text-foreground">
              {PAYOUT_STATUS[item.status] ?? item.status}
            </AppText>
          </AppView>
          <AppText className="mt-1 text-[12px] text-muted">
            {item.payout_reference} · {item.paid_at ? 'Paid' : 'Period ending'}{' '}
            {formatDayTime(item.paid_at ?? item.period_end)}
          </AppText>
        </AppView>
      ))}
    </>
  );
}

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

/** The wallet body: balance, payout account, payouts and transactions. */
export function WalletContent() {
  const router = useRouter();
  const walletQuery = useWallet();
  const { refreshing, refresh } = usePullToRefresh();
  const wallet = walletQuery.data;
  const { data: profile } = useDriverProfile();
  const payout = useRequestPayout();
  const payouts = usePayouts();
  const bankVerified = profile?.bank?.status === 'verified';
  const [view, setView] = useState<WalletView>('all');
  const [filter, setFilter] = useState<TxnFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);

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

  const pendingPayouts = (payouts.data ?? []).filter((p) =>
    ['CREATED', 'PROCESSING', 'NEEDS_ATTENTION'].includes(p.status),
  );
  const transactions = (wallet?.transactions ?? []).filter((t) =>
    filter === 'in' ? t.amount >= 0 : filter === 'out' ? t.amount < 0 : true,
  );

  return (
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
      <AppView className="items-center gap-2 rounded-2xl border border-border bg-card px-5 py-5">
        <AppText className="text-[14px] font-medium text-foreground-secondary">
          Your wallet balance
        </AppText>
        <AppText
          className={`text-[36px] font-black ${wallet && wallet.balance < 0 ? 'text-red-600' : 'text-foreground'}`}
        >
          {wallet ? formatRupees(wallet.balance) : '—'}
        </AppText>
        <AppPressable
          onPress={handleWithdraw}
          disabled={payout.isPending || !wallet}
          accessibilityRole="button"
          className="mt-1 flex-row items-center gap-2 rounded-full border border-foreground/60 px-6 py-2.5"
        >
          <Icon name="banknote" size={16} tone="icon-strong" />
          <AppText className="text-[14px] font-bold text-foreground">
            {payout.isPending ? 'Processing…' : 'Money transfer'}
          </AppText>
        </AppPressable>
        <AppPressable
          onPress={() => router.push('/setup-bank')}
          accessibilityRole="button"
          className="py-1"
        >
          <AppText className="text-[12px] text-muted">
            {profile?.bank
              ? `To ${profile.bank.bankName} · ${profile.bank.accountLast4}${bankVerified ? '' : ' (in review)'}  ·  `
              : 'No bank account yet  ·  '}
            <AppText className="text-[12px] font-bold text-brand">
              {profile?.bank ? 'Change' : 'Add bank'}
            </AppText>
          </AppText>
        </AppPressable>
        {wallet && wallet.balance < 0 ? (
          <AppText className="text-center text-[12px] text-amber-700">
            Cash commission due. It is settled from your next online-paid trips.
          </AppText>
        ) : null}
      </AppView>

      <AppPressable
        onPress={() => router.push('/refer')}
        accessibilityRole="button"
        className="flex-row items-center justify-between rounded-2xl bg-brand/10 px-5 py-4"
      >
        <AppView>
          <AppText className="text-[12px] font-medium text-foreground-secondary">
            Refer and earn
          </AppText>
          <AppText className="text-[18px] font-extrabold text-foreground">
            Invite friends to drive
          </AppText>
        </AppView>
        <Icon name="gift.fill" size={28} tone="brand" />
      </AppPressable>

      <AppView className="gap-3">
        <AppView row className="items-center justify-between px-1">
          <AppText className="text-[16px] font-extrabold text-foreground">
            Transaction history
          </AppText>
          {view === 'all' ? (
            <AppPressable
              onPress={() => setFilterOpen(true)}
              accessibilityRole="button"
              hitSlop={8}
            >
              <AppText className="text-[14px] font-bold text-brand">
                Filter{filter === 'all' ? '' : ` · ${filter === 'in' ? 'Money in' : 'Money out'}`}
              </AppText>
            </AppPressable>
          ) : null}
        </AppView>

        <AppView row className="gap-2">
          {VIEWS.map((v) => {
            const selected = view === v.value;
            return (
              <AppPressable
                key={v.value}
                onPress={() => setView(v.value)}
                accessibilityState={{ selected }}
                className={`rounded-full px-4 py-2 ${selected ? 'bg-brand' : 'bg-surface-muted'}`}
              >
                <AppText
                  className={`text-[13px] font-bold ${selected ? 'text-white' : 'text-muted'}`}
                >
                  {v.label}
                </AppText>
              </AppPressable>
            );
          })}
        </AppView>

        {view === 'all' ? (
          <>
            {walletQuery.isLoading ? <AppSpinner /> : null}
            {walletQuery.isError ? (
              <AppText className="text-muted">Could not load wallet. Pull to retry.</AppText>
            ) : null}
            {wallet && transactions.length === 0 ? (
              <AppView className="items-center gap-2 py-8">
                <Icon name="banknote" size={30} tone="icon-subtle" />
                <AppText className="text-center text-[13px] text-muted">
                  No transactions yet
                </AppText>
              </AppView>
            ) : null}
            {transactions.map((txn) => (
              <TransactionRow key={txn.id} txn={txn} />
            ))}
          </>
        ) : (
          <PayoutList
            items={view === 'pending' ? pendingPayouts : (payouts.data ?? [])}
            loading={payouts.isPending}
            error={payouts.isError}
            onRetry={() => void payouts.refetch()}
            emptyText={view === 'pending' ? 'No pending transfers' : 'No payouts yet'}
          />
        )}
      </AppView>

      <OptionSheet
        isPresented={filterOpen}
        title="Filter transactions"
        options={FILTER_OPTIONS.map((o) => o.label)}
        onSelect={(label) => {
          setFilter(FILTER_OPTIONS.find((o) => o.label === label)?.value ?? 'all');
          setFilterOpen(false);
        }}
        onDismiss={() => setFilterOpen(false)}
      />
    </AppScrollView>
  );
}

export function DriverWalletScreen() {
  return (
    <SetupScreenLayout title="Wallet" subtitle="Earnings, incentives and payouts">
      <WalletContent />
    </SetupScreenLayout>
  );
}
