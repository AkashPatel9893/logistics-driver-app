import { Alert } from 'react-native';

import { AppText, AppView, Button, Icon } from '@/components/ui';
import { useCollectCash } from '@/hooks/use-jobs';
import { getErrorMessage } from '@/lib/api/api-error';
import type { DriverJob } from '@/lib/api/models';
import { formatRupees } from '@/lib/format';

export interface PaymentCollectCardProps {
  job: DriverJob;
  /** Called with the updated job once cash is recorded. */
  onCollected?: (job: DriverJob) => void;
}

/** Collect by UPI QR or cash. Shown only after the stop's code is verified. */
export function PaymentCollectCard({ job, onCollected }: PaymentCollectCardProps) {
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
            collectCash.mutate(job, {
              onSuccess: onCollected,
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
      {/* UPI QR returns with the payment gateway; cash is the only method today. */}
      <Button
        variant="brand"
        label={collectCash.isPending ? 'Saving…' : 'Cash received'}
        leftIcon={<Icon name="banknote" size={18} color="#ffffff" />}
        onPress={confirmCash}
        disabled={collectCash.isPending}
        size="lg"
        textClassName="font-extrabold text-[15px]"
      />
    </AppView>
  );
}
