import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  FocusAwareStatusBar,
  Icon,
} from '@/components/ui';
import { useDriverStore } from '@/stores/driver-store';

export function TripCompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const driverFullName = useDriverStore((s) => s.name);
  const driverName = driverFullName.split(' ')[0] || 'Arun';

  return (
    <AppView className="flex-1 bg-[#FBFBFC] dark:bg-background">
      <FocusAwareStatusBar />

      {/* Top Header */}
      <AppView style={{ paddingTop: Math.max(insets.top, 12) + 4 }} className="px-6 pb-2">
        <AppText className="text-[28px] font-black tracking-tight text-foreground">
          Delivery complete
        </AppText>
        <AppText className="text-[15px] font-medium text-muted">
          Booking #MV-2048 · Today, 2:38 pm
        </AppText>
      </AppView>

      <AppScrollView
        contentContainerClassName="items-center px-6 pb-12 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Soft Mint Checkmark Circle */}
        <AppView className="h-24 w-24 items-center justify-center rounded-full bg-[#E8F8EE] dark:bg-emerald-950/40">
          <Icon name="checkmark" size={36} color="#16a34a" weight="bold" />
        </AppView>

        <AppText className="mt-4 text-center text-[24px] font-black text-foreground">
          Great work, {driverName}!
        </AppText>
        <AppText className="mt-1 text-center text-[15px] font-medium text-muted">
          The package was delivered successfully.
        </AppText>

        {/* Figma Trip Details Card */}
        <AppView className="mt-6 w-full rounded-[28px] border border-border/80 bg-card p-5 shadow-sm gap-4">
          {/* Pickup location */}
          <AppView>
            <AppView row className="items-center gap-2">
              <AppView className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <AppText className="text-[11px] font-bold uppercase tracking-wider text-muted">
                PICKUP
              </AppText>
            </AppView>
            <AppText className="mt-1 text-[16px] font-bold text-foreground">
              Hans Bhawan Wing-1, IP Estate
            </AppText>
          </AppView>

          {/* Drop location */}
          <AppView>
            <AppView row className="items-center gap-2">
              <AppView className="h-2.5 w-2.5 rounded-full bg-brand" />
              <AppText className="text-[11px] font-bold uppercase tracking-wider text-muted">
                DROP-OFF
              </AppText>
            </AppView>
            <AppText className="mt-1 text-[16px] font-bold text-foreground">
              DLF Cyber City, Phase 3, Gurugram
            </AppText>
          </AppView>

          {/* Side-by-side Distance & Time */}
          <AppView row className="gap-3 pt-1">
            <AppView className="flex-1 rounded-2xl border border-border/60 bg-[#F9F9FB] dark:bg-card/60 p-4">
              <AppText className="text-[12px] font-bold uppercase text-muted">DISTANCE</AppText>
              <AppText className="mt-1 text-[22px] font-black text-foreground">18.4 km</AppText>
            </AppView>

            <AppView className="flex-1 rounded-2xl border border-border/60 bg-[#F9F9FB] dark:bg-card/60 p-4">
              <AppText className="text-[12px] font-bold uppercase text-muted">TIME</AppText>
              <AppText className="mt-1 text-[22px] font-black text-foreground">46 min</AppText>
            </AppView>
          </AppView>

          {/* Earnings summary */}
          <AppView className="pt-2 border-t border-border/60">
            <AppText className="text-[14px] font-medium text-muted">Your earnings</AppText>
            <AppText className="text-[38px] font-black text-brand leading-tight">₹524</AppText>
            <AppText className="mt-1 text-[14px] text-muted">
              Cash collected from customer · ₹620
            </AppText>
          </AppView>
        </AppView>

        {/* Action Buttons */}
        <AppView className="mt-7 w-full gap-3">
          <AppPressable
            onPress={() => router.replace('/home')}
            pressScale={0.97}
            className="items-center justify-center rounded-full bg-[#18181B] dark:bg-white py-4 shadow-md active:opacity-90"
          >
            <AppText className="text-[16px] font-black text-white dark:text-black">
              Back to home
            </AppText>
          </AppPressable>

          <AppPressable
            onPress={() => router.push('/earnings')}
            pressScale={0.97}
            className="items-center justify-center rounded-full border border-border/80 bg-card py-4 shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800"
          >
            <AppText className="text-[16px] font-black text-foreground">View earnings</AppText>
          </AppPressable>
        </AppView>
      </AppScrollView>
    </AppView>
  );
}
