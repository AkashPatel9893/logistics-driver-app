import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { AppPressable, AppText, AppView, Button, Icon } from '@/components/ui';
import { useCollectCash } from '@/hooks/use-jobs';
import { getErrorMessage } from '@/lib/api/api-error';
import type { DriverJob } from '@/lib/api/models';
import { formatRupees } from '@/lib/format';

export interface PaymentCollectCardProps {
  job: DriverJob;
}

/** Cash orders: collect by UPI QR or cash before the stop can be completed. */
export function PaymentCollectCard({ job }: PaymentCollectCardProps) {
  const router = useRouter();
  const collectCash = useCollectCash();
  const { payment } = job;

  if (payment.status === 'collected') {
    return (
      <AppView row className="items-center gap-2 rounded-2xl bg-emerald-500/10 p-3.5">
        <Icon name="checkmark.circle.fill" size={18} color="#10b981" />
        <AppText className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400">
          {formatRupees(payment.amount)} received via{' '}
          {payment.collectedVia === 'upi' ? 'UPI' : 'cash'}
        </AppText>
      </AppView>
    );
  }

  const confirmCash = () =>
    Alert.alert(
      `Received ${formatRupees(payment.amount)} in cash?`,
      'Only confirm once you have the full amount in hand.',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Yes, received',
          onPress: () =>
            collectCash.mutate(job.id, {
              onError: (error) => Alert.alert('Could not record payment', getErrorMessage(error)),
            }),
        },
      ],
    );

  return (
    <AppView className="gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5">
      <AppView row className="items-center justify-between">
        <AppText className="text-[14px] font-bold text-foreground">Collect payment</AppText>
        <AppText className="text-[20px] font-black text-foreground">
          {formatRupees(payment.amount)}
        </AppText>
      </AppView>
      <Button
        variant="brand"
        label="Show UPI QR"
        leftIcon={<Icon name="qrcode" size={18} color="#ffffff" />}
        onPress={() => router.push('/payment-qr')}
        size="lg"
        textClassName="font-extrabold text-[15px]"
      />
      <AppPressable
        onPress={confirmCash}
        disabled={collectCash.isPending}
        className="items-center py-1.5 active:opacity-75"
      >
        <AppText className="text-[13px] font-bold text-foreground-secondary">
          {collectCash.isPending ? 'Saving…' : 'Customer paid in cash'}
        </AppText>
      </AppPressable>
    </AppView>
  );
}
