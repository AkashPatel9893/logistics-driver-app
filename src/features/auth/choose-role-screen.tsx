import { useCanGoBack, useRouter } from 'expo-router';
import { switchDashboardRole } from '@/features/fleet/switch-role';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
} from '@/components/ui';
import { useFleetStore } from '@/features/fleet/use-fleet-store';
import { goBack } from '@/lib/go-back';

export type RoleType = 'driver' | 'owner';

export function ChooseRoleScreen() {
  const router = useRouter();
  // This screen's own stack: no back button when it is the first screen (e.g. after a restart).
  const canGoBack = useCanGoBack();
  const insets = useSafeAreaInsets();
  const setDashboardRole = switchDashboardRole;
  const currentRole = useFleetStore.use.dashboardRole();

  const [selectedRole, setSelectedRole] = useState<RoleType>(currentRole || 'driver');

  const handleContinue = () => {
    setDashboardRole(selectedRole);

    if (selectedRole === 'driver') {
      // Rider: vehicle type first, then driver details.
      router.push('/(auth)/select-vehicle');
    } else {
      // Fleet: owner profile and company details on the sign-up screen (creates the profile too).
      router.push('/(auth)/onboarding');
    }
  };

  const isRider = selectedRole === 'driver';
  const isFleet = selectedRole === 'owner';

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        className="flex-1 px-6 pb-8 justify-between"
      >
        <AppScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-6">
          {/* Header with back button */}
          <AppView row className="items-center min-h-[48px] gap-3 mb-2">
            {canGoBack ? <LiquidGlassBackButton onPress={() => goBack(router)} /> : null}
            <AppText className="text-[22px] font-black text-foreground">Choose your role</AppText>
          </AppView>

          {/* Subtitle */}
          <AppText className="mt-2 text-[15px] leading-5 text-muted">
            {"Tell us how you'll use the app. We'll show options that fit your role."}
          </AppText>

          {/* Role Cards List */}
          <AppView className="mt-6 gap-4">
            {/* 1. Rider Card */}
            <AppPressable
              onPress={() => setSelectedRole('driver')}
              pressScale={0.98}
              accessibilityRole="radio"
              accessibilityState={{ selected: isRider }}
              className={`rounded-[18px] border-2 p-5 shadow-sm transition-colors ${
                isRider
                  ? 'border-[#FF5722] bg-card'
                  : 'border-border/80 bg-card active:bg-neutral-100 dark:active:bg-neutral-800'
              }`}
            >
              <AppView row className="items-center justify-between">
                <AppText className="text-[18px] font-black text-foreground">Rider</AppText>
                {isRider ? <Icon name="check" size={18} tone="brand" /> : null}
              </AppView>
              <AppText className="mt-1.5 text-[13px] leading-5 text-muted">
                Drive a vehicle and earn with delivery jobs.
              </AppText>
            </AppPressable>

            {/* 2. Owner of Multiple Vehicles (Fleet) Card */}
            <AppPressable
              onPress={() => setSelectedRole('owner')}
              pressScale={0.98}
              accessibilityRole="radio"
              accessibilityState={{ selected: isFleet }}
              className={`rounded-[18px] border-2 p-5 shadow-sm transition-colors ${
                isFleet
                  ? 'border-[#FF5722] bg-card'
                  : 'border-border/80 bg-card active:bg-neutral-100 dark:active:bg-neutral-800'
              }`}
            >
              <AppView row className="items-center justify-between">
                <AppText className="text-[17px] font-black text-foreground">
                  Owner of Multiple Vehicles (Fleet)
                </AppText>
                {isFleet ? <Icon name="check" size={18} tone="brand" /> : null}
              </AppView>
              <AppText className="mt-1.5 text-[13px] leading-5 text-muted">
                Own a vehicle and manage your business.
              </AppText>
            </AppPressable>
          </AppView>

          {/* Centered guidance text */}
          <AppText className="mt-8 text-center text-[13px] text-muted">
            Select the role and continue
          </AppText>
        </AppScrollView>

        {/* Bottom Button & Hint */}
        <AppView className="pt-3">
          <AppPressable
            onPress={handleContinue}
            pressScale={0.97}
            className="w-full items-center justify-center rounded-2xl bg-[#1A1A1A] dark:bg-white py-4 shadow-sm"
          >
            <AppText className="text-[16px] font-bold text-white dark:text-[#1A1A1A]">
              Continue
            </AppText>
          </AppPressable>
        </AppView>
      </AppView>
    </AppView>
  );
}
