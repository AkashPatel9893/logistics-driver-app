import { useCanGoBack, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, AppView, FocusAwareStatusBar, LiquidGlassBackButton } from '@/components/ui';
import { goBack } from '@/lib/go-back';

export interface SetupScreenLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Shown at the right of the header, e.g. a Help button. */
  right?: ReactNode;
}

/** Header + body shell shared by the driver's form screens. */
export function SetupScreenLayout({ title, subtitle, children, right }: SetupScreenLayoutProps) {
  const router = useRouter();
  // No back button when this is the first screen (e.g. Documents for a driver awaiting approval).
  const canGoBack = useCanGoBack();
  const insets = useSafeAreaInsets();

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        className="border-b border-border/80 bg-surface px-5 pb-3.5 shadow-sm"
      >
        <AppView row className="min-h-[44px] items-center gap-3">
          {canGoBack ? <LiquidGlassBackButton onPress={() => goBack(router)} /> : null}
          <AppView className="flex-1">
            <AppText className="text-[20px] font-black text-foreground">{title}</AppText>
            <AppText className="text-[12px] text-muted">{subtitle}</AppText>
          </AppView>
          {right}
        </AppView>
      </AppView>
      {children}
    </AppView>
  );
}
