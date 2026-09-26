import { useRouter } from 'expo-router';

import { AppPressable, AppText, AppView, Icon, type IconName } from '@/components/ui';
import type { DriverProfile, VerificationStatus } from '@/lib/api/models';

export interface DriverSetupChecklistProps {
  profile: DriverProfile;
  className?: string;
}

type StepState = 'todo' | VerificationStatus;

const STATE_BADGE: Record<StepState, { label: string; className: string; text: string }> = {
  todo: {
    label: 'Pending',
    className: 'bg-[#F3ECE6] dark:bg-neutral-800',
    text: 'text-[#8C7A6B] dark:text-neutral-300',
  },
  under_review: {
    label: 'In review',
    className: 'bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
  },
  verified: {
    label: 'Verified',
    className: 'bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  rejected: {
    label: 'Fix needed',
    className: 'bg-red-500/15',
    text: 'text-red-600 dark:text-red-400',
  },
};

export function DriverSetupChecklist({ profile, className = '' }: DriverSetupChecklistProps) {
  const router = useRouter();
  const { vehicle, kyc, bank } = profile;

  const items: {
    id: string;
    title: string;
    subtitle: string;
    action: string;
    icon: IconName;
    state: StepState;
    route: '/setup-vehicle' | '/setup-kyc' | '/setup-bank';
  }[] = [
    {
      id: 'vehicle',
      title: 'Add your vehicle',
      subtitle: vehicle
        ? `${vehicle.model} · ${vehicle.plateNumber}`
        : 'Vehicle details & RC photo',
      action: vehicle ? 'Edit vehicle' : 'Add vehicle',
      icon: 'box.truck.fill',
      state: vehicle?.status ?? 'todo',
      route: '/setup-vehicle',
    },
    {
      id: 'kyc',
      title: 'Add your KYC details',
      subtitle: kyc
        ? `PAN ${kyc.panNumber.slice(0, 2)}•••••${kyc.panNumber.slice(-3)}`
        : 'Driving licence, PAN & Aadhaar',
      action: kyc ? 'Edit KYC' : 'Add KYC details',
      icon: 'checkmark.shield.fill',
      state: kyc?.status ?? 'todo',
      route: '/setup-kyc',
    },
    {
      id: 'bank',
      title: 'Add your bank details',
      subtitle: bank ? `${bank.bankName} •• ${bank.accountLast4}` : 'Account for wallet payouts',
      action: bank ? 'Edit bank' : 'Add bank details',
      icon: 'banknote',
      state: bank?.status ?? 'todo',
      route: '/setup-bank',
    },
  ];

  const inReview = items.some((i) => i.state === 'under_review');

  return (
    <AppView className={`gap-3 ${className}`}>
      <AppView className="gap-1 px-1">
        <AppText className="text-[22px] font-extrabold text-foreground">Finish setting up</AppText>
        <AppText className="text-[13px] text-muted">
          {inReview
            ? 'We are reviewing your documents. This usually takes a few minutes.'
            : 'Complete these steps to start taking trips.'}
        </AppText>
      </AppView>

      {items.map((item) => {
        const badge = STATE_BADGE[item.state];
        return (
          <AppView
            key={item.id}
            className="rounded-[24px] border border-border/80 bg-card p-4 shadow-sm"
          >
            <AppView row className="items-center justify-between">
              <AppView row className="flex-1 items-center gap-3">
                <AppView className="h-12 w-12 items-center justify-center rounded-2xl bg-[#FFEFE9] dark:bg-[#3D1E12]">
                  <Icon
                    name={item.icon}
                    size={22}
                    tone="brand"
                    color={item.state === 'verified' ? '#10b981' : undefined}
                  />
                </AppView>
                <AppView className="flex-1 pr-2">
                  <AppText className="text-[16px] font-bold text-foreground">{item.title}</AppText>
                  <AppText className="text-[12px] text-muted" numberOfLines={1}>
                    {item.subtitle}
                  </AppText>
                </AppView>
              </AppView>
              <AppView className={`rounded-full px-3 py-1 ${badge.className}`}>
                <AppText className={`text-[11px] font-bold ${badge.text}`}>{badge.label}</AppText>
              </AppView>
            </AppView>

            {item.state !== 'verified' ? (
              <AppPressable
                onPress={() => router.push(item.route)}
                pressScale={0.98}
                className="mt-3.5 w-full items-center justify-center rounded-full border border-border bg-background py-2.5 active:bg-neutral-100 dark:active:bg-neutral-800"
              >
                <AppText className="text-[14px] font-bold text-foreground">{item.action}</AppText>
              </AppPressable>
            ) : null}
          </AppView>
        );
      })}
    </AppView>
  );
}
