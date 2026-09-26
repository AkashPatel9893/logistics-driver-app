import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppImage,
  AppScrollView,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  LiquidGlassBackButton,
} from '@/components/ui';
import { useDriverStore } from '@/stores/driver-store';

export function PaymentQrScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const activeJob = useDriverStore((s) => s.activeJob);
  const markPaymentCollected = useDriverStore((s) => s.markPaymentCollected);

  const amount = activeJob?.fare || 620;
  const orderRef = activeJob ? `MV-${activeJob.id.slice(-4).toUpperCase()}` : 'MV-2048';

  const handlePaymentSuccess = () => {
    markPaymentCollected();
    Alert.alert('Payment Received! ₹' + amount, 'Payment verified successfully via UPI.', [
      {
        text: 'Continue',
        onPress: () => router.back(),
      },
    ]);
  };

  return (
    <AppView className="flex-1 bg-[#FBFBFC] dark:bg-background">
      <FocusAwareStatusBar />

      {/* Top Header */}
      <AppView style={{ paddingTop: Math.max(insets.top, 12) + 4 }} className="px-6 pb-2">
        <AppView row className="items-center justify-between">
          <AppView>
            <AppText className="text-[28px] font-black tracking-tight text-foreground">
              Payment QR
            </AppText>
            <AppText className="text-[15px] font-medium text-muted">
              Scan to collect payment for this delivery
            </AppText>
          </AppView>
          <LiquidGlassBackButton onPress={() => router.back()} />
        </AppView>
      </AppView>

      <AppScrollView
        contentContainerClassName="items-center px-6 pb-12 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Figma Payment QR Card */}
        <AppView className="w-full max-w-[380px] rounded-[28px] border border-border/80 bg-card p-6 shadow-sm">
          {/* Card Header */}
          <AppView row className="items-center justify-between">
            <AppView className="flex-1 pr-2">
              <AppText className="text-[18px] font-black text-foreground">Payment QR</AppText>
              <AppText className="text-[13px] text-muted leading-4 mt-0.5">
                Scan to collect payment for this delivery.
              </AppText>
            </AppView>
            <AppView className="rounded-full bg-[#FFEFE9] dark:bg-brand/20 px-3 py-1">
              <AppText className="text-[12px] font-black text-brand">Ready</AppText>
            </AppView>
          </AppView>

          {/* QR Code Container */}
          <AppView className="my-5 items-center justify-center rounded-[24px] bg-[#F8F9FA] dark:bg-card/60 p-6 border border-border/50">
            <AppView className="h-60 w-60 items-center justify-center overflow-hidden rounded-xl bg-white p-2">
              <AppImage
                source={require('../../../../assets/images/driver/payment-qr.png')}
                contentFit="contain"
                className="h-full w-full"
              />
            </AppView>
          </AppView>

          {/* Fare & Ref Rows */}
          <AppView className="gap-3 pt-1">
            <AppView row className="items-center justify-between">
              <AppText className="text-[15px] font-medium text-muted">Amount</AppText>
              <AppText className="text-[26px] font-black text-foreground">₹{amount}</AppText>
            </AppView>

            <AppView row className="items-center justify-between border-t border-border/60 pt-3">
              <AppText className="text-[15px] font-medium text-muted">Reference</AppText>
              <AppText className="text-[16px] font-bold text-foreground">{orderRef}</AppText>
            </AppView>
          </AppView>
        </AppView>

        {/* Payment Confirmation Button */}
        <AppView className="mt-6 w-full max-w-[380px]">
          <Button
            variant="brand"
            label={`Confirm ₹${amount} Received`}
            onPress={handlePaymentSuccess}
            size="lg"
            className="rounded-full shadow-lg shadow-brand/25"
            textClassName="font-extrabold text-[16px]"
          />
        </AppView>
      </AppScrollView>
    </AppView>
  );
}
