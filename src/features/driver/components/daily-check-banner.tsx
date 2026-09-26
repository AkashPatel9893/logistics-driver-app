import { useRouter } from 'expo-router';

import { AppPressable, AppText, AppView, Icon } from '@/components/ui';

export interface DailyCheckBannerProps {
  completed: boolean;
  className?: string;
}

export function DailyCheckBanner({ completed, className = '' }: DailyCheckBannerProps) {
  const router = useRouter();

  if (completed) {
    return (
      <AppView
        className={`rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 ${className}`}
      >
        <AppView row className="items-center justify-between">
          <AppView row className="items-center gap-2.5">
            <Icon name="checkmark.circle.fill" size={20} color="#10b981" />
            <AppText className="text-[13px] font-bold text-emerald-800 dark:text-emerald-300">
              Daily check completed (+₹50 credited)
            </AppText>
          </AppView>
        </AppView>
      </AppView>
    );
  }

  return (
    <AppPressable
      onPress={() => router.push('/daily-check')}
      pressScale={0.97}
      className={`flex-row items-center justify-between rounded-2xl border border-brand/30 bg-brand/10 p-3.5 shadow-sm active:bg-brand/15 ${className}`}
    >
      <AppView row className="flex-1 items-center gap-3">
        <AppView className="h-10 w-10 items-center justify-center rounded-xl bg-brand/20">
          <Icon name="camera" size={20} tone="brand" />
        </AppView>
        <AppView className="flex-1">
          <AppView row className="items-center gap-2">
            <AppText className="text-[14px] font-bold text-foreground">
              Daily Photo Verification
            </AppText>
            <AppView className="rounded-full bg-brand px-2 py-0.5">
              <AppText className="text-[10px] font-black text-white">+₹50</AppText>
            </AppView>
          </AppView>
          <AppText className="text-[12px] text-muted">
            Upload vehicle selfie to unlock priority deliveries
          </AppText>
        </AppView>
      </AppView>

      <Icon name="chevron.right" size={16} tone="brand" />
    </AppPressable>
  );
}
