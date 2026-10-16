import { useRouter } from 'expo-router';

import {
  AppPressable,
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Icon,
  LiquidGlassBackButton,
} from '@/components/ui';
import { useDriverProfile } from '@/hooks/use-driver';
import { useFleetStore } from '@/features/fleet/use-fleet-store';
import { FleetVehiclesSection } from '@/features/fleet/components';
import type { VerificationStatus } from '@/lib/api/models';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STATUS: Record<VerificationStatus | 'missing', { label: string; color: string; bg: string }> =
  {
    verified: {
      label: 'VERIFIED',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/15',
    },
    under_review: {
      label: 'IN REVIEW',
      color: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-500/15',
    },
    rejected: { label: 'REJECTED', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/15' },
    missing: { label: 'NOT ADDED', color: 'text-muted', bg: 'bg-surface-muted' },
  };

export function DriverProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile } = useDriverProfile();
  const company = useFleetStore.use.company();

  if (!profile) {
    return (
      <AppView className="flex-1 items-center justify-center bg-background p-6">
        <AppSpinner size="large" />
      </AppView>
    );
  }

  const { vehicle, kyc, bank } = profile;
  const documents: {
    name: string;
    id: string | undefined;
    status: VerificationStatus | 'missing';
    route: '/setup-kyc' | '/setup-vehicle' | '/setup-bank';
  }[] = [
    {
      name: 'Driving licence',
      id: kyc?.dlNumber,
      status: kyc?.status ?? 'verified',
      route: '/setup-kyc' as const,
    },
    {
      name: 'PAN card',
      id: kyc?.panNumber,
      status: kyc?.status ?? 'verified',
      route: '/setup-kyc' as const,
    },
    {
      name: 'Registration certificate',
      id: vehicle?.plateNumber ?? 'KA 03 MX 2814',
      status: vehicle?.status ?? 'verified',
      route: '/setup-vehicle' as const,
    },
    {
      name: 'Bank account',
      id: bank ? `${bank.bankName} •• ${bank.accountLast4}` : 'HDFC Bank •• 4210',
      status: bank?.status ?? 'verified',
      route: '/setup-bank' as const,
    },
  ];

  return (
    <AppView className="flex-1 bg-background">
      <AppScrollView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        contentContainerClassName="gap-5 px-5 pb-24"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <AppView row className="items-center justify-between min-h-[44px]">
          <LiquidGlassBackButton onPress={() => router.back()} />
          <AppText className="text-[20px] font-black text-foreground">Profile</AppText>
          <AppView className="w-10" />
        </AppView>

        {/* Company & Owner Info Card matching Screenshot 1 Screen 7 */}
        <AppView className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <AppView row className="items-center justify-between">
            <AppText className="text-[20px] font-black text-foreground">
              {company.companyName || 'Company Name'}
            </AppText>
            <AppPressable
              onPress={() => router.push('/company-details' as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AppText className="text-[14px] font-bold text-[#FF5722]">Edit</AppText>
            </AppPressable>
          </AppView>

          <AppText className="mt-1 text-[15px] font-semibold text-foreground">
            {company.ownerName || "Owner's Name"}
          </AppText>

          <AppText className="mt-0.5 text-[13px] text-muted">
            Registered Address: {company.registeredAddress || '12 MG Road, Pune 411001'}
          </AppText>

          <AppText className="mt-0.5 text-[13px] font-medium text-foreground-secondary">
            {company.phone || '+91 98765 43210'}
          </AppText>
        </AppView>

        {/* My Vehicles Section matching Screenshot 1 Screen 7 */}
        <FleetVehiclesSection />

        {/* Verification & KYC Documents */}
        <AppView className="gap-2.5">
          <AppText className="px-1 text-[18px] font-extrabold text-foreground">
            Owner-Driver Verification
          </AppText>

          <AppView className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
            {documents.map((doc, idx) => {
              const meta = STATUS[doc.status];
              return (
                <AppPressable
                  key={doc.name}
                  onPress={() => router.push(doc.route)}
                  pressScale={0.98}
                  className={`flex-row items-center justify-between p-4 ${
                    idx !== documents.length - 1 ? 'border-b border-border/60' : ''
                  } active:bg-neutral-100 dark:active:bg-neutral-800`}
                >
                  <AppView className="flex-1 pr-3">
                    <AppText className="text-[14px] font-bold text-foreground">{doc.name}</AppText>
                    {doc.id ? (
                      <AppText className="mt-0.5 text-[12px] text-muted">{doc.id}</AppText>
                    ) : null}
                  </AppView>

                  <AppView row className="items-center gap-2">
                    <AppView className={`rounded-full px-2.5 py-0.5 ${meta.bg}`}>
                      <AppText className={`text-[11px] font-extrabold ${meta.color}`}>
                        {meta.label}
                      </AppText>
                    </AppView>
                    <Icon name="chevron.right" size={14} tone="icon-subtle" />
                  </AppView>
                </AppPressable>
              );
            })}
          </AppView>
        </AppView>
      </AppScrollView>
    </AppView>
  );
}
