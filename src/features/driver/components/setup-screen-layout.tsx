import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, AppView, FocusAwareStatusBar, LiquidGlassBackButton } from '@/components/ui';

export interface SetupScreenLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Header + body shell shared by the driver's form screens. */
export function SetupScreenLayout({ title, subtitle, children }: SetupScreenLayoutProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        className="border-b border-border/80 bg-card px-5 pb-3.5 shadow-sm"
      >
        <AppView row className="items-center gap-3">
          <LiquidGlassBackButton onPress={() => router.back()} />
          <AppView className="flex-1">
            <AppText className="text-[20px] font-black text-foreground">{title}</AppText>
            <AppText className="text-[12px] text-muted">{subtitle}</AppText>
          </AppView>
        </AppView>
      </AppView>
      {children}
    </AppView>
  );
}
