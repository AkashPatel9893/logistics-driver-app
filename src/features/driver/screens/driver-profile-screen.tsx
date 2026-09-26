import { useRouter } from 'expo-router';

import { AppPressable, AppScrollView, AppSpinner, AppText, AppView, Icon } from '@/components/ui';
import { useDriverProfile } from '@/hooks/use-driver';
import type { VerificationStatus } from '@/lib/api/models';
import { formatShortDate } from '@/lib/format';

import { SetupScreenLayout } from '../components/setup-screen-layout';

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <AppView row className="items-center justify-between">
      <AppText className="text-[13px] text-muted">{label}</AppText>
      <AppText className="text-[14px] font-bold text-foreground">{value}</AppText>
    </AppView>
  );
}

export function DriverProfileScreen() {
  const router = useRouter();
  const { data: profile } = useDriverProfile();
  if (!profile) {
    return (
      <SetupScreenLayout title="Driver profile" subtitle="Personal details and documents">
        <AppSpinner size="large" className="mt-10" />
      </SetupScreenLayout>
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
      status: kyc?.status ?? 'missing',
      route: '/setup-kyc' as const,
    },
    {
      name: 'PAN card',
      id: kyc?.panNumber,
      status: kyc?.status ?? 'missing',
      route: '/setup-kyc' as const,
    },
    {
      name: 'Registration certificate',
      id: vehicle?.plateNumber,
      status: vehicle?.status ?? 'missing',
      route: '/setup-vehicle' as const,
    },
    {
      name: 'Bank account',
      id: bank ? `${bank.bankName} •• ${bank.accountLast4}` : undefined,
      status: bank?.status ?? 'missing',
      route: '/setup-bank' as const,
    },
  ];

  return (
    <SetupScreenLayout title="Driver profile" subtitle="Personal details and documents">
      <AppScrollView
        contentContainerClassName="gap-5 px-5 pb-16 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <AppView className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <AppView row className="items-center gap-4">
            <AppView className="h-16 w-16 items-center justify-center rounded-full border-2 border-brand/30 bg-brand/10">
              <AppText className="text-[24px] font-black text-brand">
                {profile.name.slice(0, 1).toUpperCase()}
              </AppText>
            </AppView>
            <AppView className="flex-1">
              <AppText className="text-[18px] font-black text-foreground">{profile.name}</AppText>
              <AppText className="text-[13px] text-muted">{profile.phone ?? profile.email}</AppText>
              <AppText className="mt-0.5 text-[12px] text-foreground-secondary">
                {profile.city ?? '—'} · Partner since {formatShortDate(profile.joinedAt)}
              </AppText>
            </AppView>
          </AppView>

          <AppView row className="mt-4 items-center justify-between border-t border-border/80 pt-3">
            <AppView row className="items-center gap-1.5">
              <Icon name="star.fill" size={14} color="#f59e0b" />
              <AppText className="text-[13px] font-bold text-foreground">
                {profile.rating != null
                  ? `${profile.rating.toFixed(2)} from ${profile.ratingCount} ratings`
                  : 'No ratings yet'}
              </AppText>
            </AppView>
            <AppView
              className={`rounded-full px-3 py-0.5 ${profile.canGoOnline ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}
            >
              <AppText
                className={`text-[11px] font-black ${profile.canGoOnline ? 'text-emerald-600' : 'text-amber-700'}`}
              >
                {profile.canGoOnline ? 'ACTIVE PARTNER' : 'SETUP PENDING'}
              </AppText>
            </AppView>
          </AppView>
        </AppView>

        <AppView className="gap-2 rounded-3xl border border-border bg-card p-5 shadow-sm">
          <AppView row className="items-center justify-between border-b border-border/60 pb-3">
            <AppView row className="items-center gap-2.5">
              <Icon name="box.truck.fill" size={20} tone="brand" />
              <AppText className="text-[16px] font-extrabold text-foreground">Vehicle</AppText>
            </AppView>
            <AppPressable onPress={() => router.push('/setup-vehicle')}>
              <AppText className="text-[12px] font-bold text-brand">
                {vehicle ? 'Update' : 'Add'}
              </AppText>
            </AppPressable>
          </AppView>
          {vehicle ? (
            <AppView className="mt-1 gap-2">
              <Row label="Type" value={vehicle.vehicleTypeName} />
              <Row label="Model" value={vehicle.model} />
              <Row label="Registration" value={vehicle.plateNumber} />
            </AppView>
          ) : (
            <AppText className="mt-1 text-[13px] text-muted">No vehicle added yet.</AppText>
          )}
        </AppView>

        <AppView className="gap-3">
          <AppText className="px-1 text-[16px] font-extrabold text-foreground">Documents</AppText>
          {documents.map((doc) => {
            const badge = STATUS[doc.status];
            return (
              <AppPressable
                key={doc.name}
                onPress={() => router.push(doc.route)}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <AppView row className="items-center justify-between">
                  <AppText className="text-[14px] font-bold text-foreground">{doc.name}</AppText>
                  <AppView className={`rounded-full px-2.5 py-0.5 ${badge.bg}`}>
                    <AppText className={`text-[10px] font-black ${badge.color}`}>
                      {badge.label}
                    </AppText>
                  </AppView>
                </AppView>
                <AppText className="mt-1.5 text-[12px] font-medium text-muted">
                  {doc.id ?? 'Tap to add'}
                </AppText>
              </AppPressable>
            );
          })}
        </AppView>
      </AppScrollView>
    </SetupScreenLayout>
  );
}
