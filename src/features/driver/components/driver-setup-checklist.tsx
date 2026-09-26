import { useRouter } from 'expo-router';

import { AppPressable, AppText, AppView, Icon } from '@/components/ui';

export interface DriverSetupChecklistProps {
  vehicleCompleted: boolean;
  kycCompleted: boolean;
  bankCompleted: boolean;
  className?: string;
}

export function DriverSetupChecklist({
  vehicleCompleted,
  kycCompleted,
  bankCompleted,
  className = '',
}: DriverSetupChecklistProps) {
  const router = useRouter();

  const items = [
    {
      id: 'vehicle',
      title: 'Add your vehicle',
      subtitle: vehicleCompleted
        ? 'Tata Ace Gold • KA 03 MX 2814'
        : 'Vehicle details & RC document',
      icon: 'box.truck.fill' as const,
      completed: vehicleCompleted,
      route: '/setup-vehicle' as const,
    },
    {
      id: 'kyc',
      title: 'Add your KYC details',
      subtitle: kycCompleted ? 'DL & Aadhaar verified' : 'Driving License & Aadhaar verification',
      icon: 'checkmark.shield.fill' as const,
      completed: kycCompleted,
      route: '/setup-kyc' as const,
    },
    {
      id: 'bank',
      title: 'Add your bank details',
      subtitle: bankCompleted ? 'HDFC Bank • •••• 5849' : 'Bank account for fast weekly payouts',
      icon: 'banknote' as const,
      completed: bankCompleted,
      route: '/setup-bank' as const,
    },
  ];

  const allCompleted = vehicleCompleted && kycCompleted && bankCompleted;

  if (allCompleted) {
    return (
      <AppView
        className={`rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 ${className}`}
      >
        <AppView row className="items-center gap-3">
          <AppView className="h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
            <Icon name="checkmark.shield.fill" size={20} color="#10b981" />
          </AppView>
          <AppView className="flex-1">
            <AppText className="text-[14px] font-bold text-emerald-800 dark:text-emerald-300">
              Profile 100% Complete
            </AppText>
            <AppText className="text-[12px] text-emerald-700/80 dark:text-emerald-400/80">
              You are eligible for high-priority instant orders.
            </AppText>
          </AppView>
        </AppView>
      </AppView>
    );
  }

  return (
    <AppView className={`gap-3 ${className}`}>
      <AppView className="gap-1 px-1">
        <AppText className="text-[22px] font-extrabold text-foreground">Finish setting up</AppText>
        <AppText className="text-[13px] text-muted">
          Complete these steps before taking your first trip.
        </AppText>
      </AppView>

      {items.map((item) => (
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
                  color={item.completed ? '#10b981' : undefined}
                />
              </AppView>
              <AppView className="flex-1 pr-2">
                <AppText className="text-[16px] font-bold text-foreground">{item.title}</AppText>
                <AppText className="text-[12px] text-muted" numberOfLines={1}>
                  {item.subtitle}
                </AppText>
              </AppView>
            </AppView>

            <AppView
              className={`rounded-full px-3 py-1 ${
                item.completed ? 'bg-emerald-500/15' : 'bg-[#F3ECE6] dark:bg-neutral-800'
              }`}
            >
              <AppText
                className={`text-[11px] font-bold ${
                  item.completed
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-[#8C7A6B] dark:text-neutral-300'
                }`}
              >
                {item.completed ? 'Done' : 'Pending'}
              </AppText>
            </AppView>
          </AppView>

          <AppPressable
            onPress={() => router.push(item.route)}
            pressScale={0.98}
            className="mt-3.5 w-full items-center justify-center rounded-full border border-border bg-background py-2.5 active:bg-neutral-100 dark:active:bg-neutral-800"
          >
            <AppText className="text-[14px] font-bold text-foreground">
              {item.id === 'vehicle'
                ? 'Add vehicle'
                : item.id === 'kyc'
                  ? 'Add KYC details'
                  : 'Add bank details'}
            </AppText>
          </AppPressable>
        </AppView>
      ))}
    </AppView>
  );
}
