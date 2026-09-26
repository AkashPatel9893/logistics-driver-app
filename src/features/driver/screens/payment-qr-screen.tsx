import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
} from '@/components/ui';
import { useCountdown } from '@/hooks/use-countdown';
import { useActiveJob, usePaymentQr } from '@/hooks/use-jobs';
import { getErrorMessage } from '@/lib/api/api-error';
import { formatRupees } from '@/lib/format';

/** How long the success state shows before returning to the stop screen. */
const SUCCESS_HOLD_MS = 1_800;

export function PaymentQrScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: job } = useActiveJob();
  const isPaid = job?.payment.status === 'collected';
  const qrQuery = usePaymentQr(job && !isPaid ? job.id : undefined);
  const qr = qrQuery.data;
  const secondsLeft = useCountdown(qr?.expiresAt);

  // The gateway webhook reaches us over the driver socket (payment.received).
  useEffect(() => {
    if (!isPaid) return;
    const timer = setTimeout(() => router.back(), SUCCESS_HOLD_MS);
    return () => clearTimeout(timer);
  }, [isPaid, router]);

  return (
    <AppView className="flex-1 bg-[#FBFBFC] dark:bg-background">
      <FocusAwareStatusBar />

      <AppView style={{ paddingTop: Math.max(insets.top, 12) + 4 }} className="px-6 pb-2">
        <AppView row className="items-center justify-between">
          <AppView>
            <AppText className="text-[28px] font-black tracking-tight text-foreground">
              Payment QR
            </AppText>
            <AppText className="text-[15px] font-medium text-muted">
              Customer scans with any UPI app
            </AppText>
          </AppView>
          <LiquidGlassBackButton onPress={() => router.back()} />
        </AppView>
      </AppView>

      <AppScrollView
        contentContainerClassName="items-center px-6 pb-12 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <AppView className="w-full max-w-[380px] rounded-[28px] border border-border/80 bg-card p-6 shadow-sm">
          <AppView row className="items-center justify-between">
            <AppView className="flex-1 pr-2">
              <AppText className="text-[18px] font-black text-foreground">
                {qr?.payeeName ?? 'RYNO Logistics'}
              </AppText>
              <AppText className="mt-0.5 text-[13px] leading-4 text-muted">
                {qr?.payeeVpa ?? 'Preparing QR…'}
              </AppText>
            </AppView>
            <AppView
              className={`rounded-full px-3 py-1 ${isPaid ? 'bg-emerald-500/15' : 'bg-[#FFEFE9] dark:bg-brand/20'}`}
            >
              <AppText
                className={`text-[12px] font-black ${isPaid ? 'text-emerald-600' : 'text-brand'}`}
              >
                {isPaid ? 'Paid' : 'Waiting'}
              </AppText>
            </AppView>
          </AppView>

          <AppView className="my-5 items-center justify-center rounded-[24px] border border-border/50 bg-[#F8F9FA] p-6 dark:bg-card/60">
            <AppView className="h-60 w-60 items-center justify-center overflow-hidden rounded-xl bg-white p-3">
              {isPaid ? (
                <AppView className="items-center">
                  <Icon name="checkmark.circle.fill" size={72} color="#10b981" />
                  <AppText className="mt-2 text-[16px] font-black text-neutral-900">
                    Payment received
                  </AppText>
                </AppView>
              ) : qr ? (
                <QRCode value={qr.upiUri} size={210} backgroundColor="#FFFFFF" color="#111111" />
              ) : qrQuery.isError ? (
                <AppText className="text-center text-[13px] text-neutral-600">
                  {getErrorMessage(qrQuery.error)}
                </AppText>
              ) : (
                <AppSpinner size="large" />
              )}
            </AppView>
          </AppView>

          <AppView className="gap-3 pt-1">
            <AppView row className="items-center justify-between">
              <AppText className="text-[15px] font-medium text-muted">Amount</AppText>
              <AppText className="text-[26px] font-black text-foreground">
                {formatRupees(job?.payment.amount ?? qr?.amount ?? 0)}
              </AppText>
            </AppView>
            <AppView row className="items-center justify-between border-t border-border/60 pt-3">
              <AppText className="text-[15px] font-medium text-muted">Reference</AppText>
              <AppText className="text-[16px] font-bold text-foreground">
                {qr?.reference ?? job?.number ?? '—'}
              </AppText>
            </AppView>
          </AppView>
        </AppView>

        {!isPaid && qr ? (
          <AppView row className="mt-5 items-center gap-2">
            <AppSpinner />
            <AppText className="text-[13px] font-medium text-muted">
              Waiting for payment · QR valid for {Math.floor(secondsLeft / 60)}:
              {String(secondsLeft % 60).padStart(2, '0')}
            </AppText>
          </AppView>
        ) : null}

        <AppView className="mt-6 w-full max-w-[380px]">
          <Button
            variant={isPaid ? 'brand' : 'secondary'}
            label={isPaid ? 'Done' : 'Back to verification'}
            onPress={() => router.back()}
            size="lg"
            className="rounded-full"
            textClassName="font-extrabold text-[16px]"
          />
        </AppView>
      </AppScrollView>
    </AppView>
  );
}
