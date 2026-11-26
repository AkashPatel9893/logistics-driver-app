import { useRouter } from 'expo-router';

import {
  AppPressable,
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  LiquidGlassBackButton,
} from '@/components/ui';
import { useDriverProfile } from '@/hooks/use-driver';
import { useFleetCompany } from '@/hooks/use-fleet';
import { FleetVehiclesSection } from '@/features/fleet/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '@/lib/go-back';
import { useAuthStore } from '@/features/auth/use-auth-store';

/** The fleet owner's company profile and vehicles. A rider's details are on Account. */
export function DriverProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile } = useDriverProfile();
  const { data: company } = useFleetCompany();
  const user = useAuthStore.use.user();

  if (!profile) {
    return (
      <AppView className="flex-1 items-center justify-center bg-background p-6">
        <AppSpinner size="large" />
      </AppView>
    );
  }

  return (
    <AppView className="flex-1 bg-background">
      <AppScrollView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        contentContainerClassName="gap-5 px-5 pb-24"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <AppView row className="items-center justify-between min-h-[44px]">
          <LiquidGlassBackButton onPress={() => goBack(router)} />
          <AppText className="text-[20px] font-black text-foreground">Profile</AppText>
          <AppView className="w-10" />
        </AppView>

        {/* Company and owner */}
        <AppView className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <AppView row className="items-center justify-between">
            <AppText className="text-[20px] font-black text-foreground">
              {company?.companyName || 'Company Profile'}
            </AppText>
            <AppPressable
              onPress={() => router.push('/company-details' as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AppText className="text-[14px] font-bold text-[#FF5722]">
                {company?.isRegistered ? 'Edit' : 'Register'}
              </AppText>
            </AppPressable>
          </AppView>

          <AppText className="mt-1 text-[15px] font-semibold text-foreground">
            {company?.ownerName || profile.name}
          </AppText>

          {user?.phone || profile.phone ? (
            <AppText className="mt-1 text-[13px] font-medium text-foreground-secondary">
              Phone: {user?.phone || profile.phone}
            </AppText>
          ) : null}

          {company?.registeredAddress ? (
            <AppText className="mt-0.5 text-[13px] text-muted">
              Registered Address: {company.registeredAddress}
            </AppText>
          ) : null}

          {company?.phone && company.phone !== user?.phone ? (
            <AppText className="mt-0.5 text-[13px] font-medium text-foreground-secondary">
              Company phone: {company.phone}
            </AppText>
          ) : null}
        </AppView>

        <FleetVehiclesSection />
      </AppScrollView>
    </AppView>
  );
}
