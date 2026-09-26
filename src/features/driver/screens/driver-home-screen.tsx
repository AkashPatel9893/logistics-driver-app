import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image } from 'react-native';
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

import { ActiveDeliveryCard } from '../components/active-delivery-card';
import { DeliveryRequestCard } from '../components/delivery-request-card';
import { DriverOnlineToggle } from '../components/driver-online-toggle';
import { DriverSetupChecklist } from '../components/driver-setup-checklist';
import { DriverStatsRow } from '../components/driver-stats-row';
import { WelcomeBonusModal } from '../components/welcome-bonus-modal';

export function DriverHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isOnline = useDriverStore((s) => s.isOnline);
  const toggleOnline = useDriverStore((s) => s.toggleOnline);
  const name = useDriverStore((s) => s.name);
  const tripsCount = useDriverStore((s) => s.tripsCount);
  const totalEarnings = useDriverStore((s) => s.totalEarnings);
  const walletBalance = useDriverStore((s) => s.walletBalance);
  const setupStatus = useDriverStore((s) => s.setupStatus);
  const welcomeBonusDismissed = useDriverStore((s) => s.welcomeBonusDismissed);
  const dismissWelcomeBonus = useDriverStore((s) => s.dismissWelcomeBonus);
  const activeJob = useDriverStore((s) => s.activeJob);
  const availableRequests = useDriverStore((s) => s.availableRequests);
  const acceptJob = useDriverStore((s) => s.acceptJob);
  const declineJob = useDriverStore((s) => s.declineJob);

  const [showBonusModal, setShowBonusModal] = useState(!welcomeBonusDismissed);

  const handleAcceptJob = (job: any) => {
    acceptJob(job);
    router.push('/active-delivery');
  };

  const isSetupIncomplete = !setupStatus.vehicle || !setupStatus.kyc || !setupStatus.bank;

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />

      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 6 }}
        className="z-20 bg-background px-5 pb-2"
      >
        <AppView row className="items-center justify-between">
          <AppView>
            <AppText className="text-[28px] font-black text-foreground">
              Good morning, {name ? name.split(' ')[0] : 'Arun'}
            </AppText>
            <AppText className="mt-0.5 text-[15px] font-medium text-muted">
              Mini truck · KA 03 MX 2814
            </AppText>
          </AppView>

          <AppPressable
            onPress={() => router.push('/support')}
            accessibilityLabel="Help and Support"
            className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800"
          >
            <Icon name="bell" size={18} tone="icon-strong" />
          </AppPressable>
        </AppView>
      </AppView>

      <AppScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-28 pt-2 gap-4"
      >
        <DriverOnlineToggle isOnline={isOnline} onToggle={toggleOnline} />

        <DriverStatsRow
          tripsCount={tripsCount}
          todayEarnings={totalEarnings}
          walletBalance={walletBalance}
        />

        {activeJob ? <ActiveDeliveryCard job={activeJob} /> : null}

        <AppView className="relative overflow-hidden rounded-[26px] bg-[#FF5722] p-5 shadow-md">
          <AppView className="max-w-[62%]">
            <AppText className="text-[17px] font-bold text-white/95">Delivering More</AppText>
            <AppText className="mt-0.5 text-[28px] font-black leading-tight text-white">
              Worrying{'\n'}Less.
            </AppText>
          </AppView>
          <Image
            source={require('../../../../assets/images/HeroTruck.png')}
            style={{ position: 'absolute', bottom: -10, right: -15, width: 170, height: 135 }}
            resizeMode="contain"
          />
        </AppView>

        {isSetupIncomplete ? (
          <DriverSetupChecklist
            vehicleCompleted={setupStatus.vehicle}
            kycCompleted={setupStatus.kyc}
            bankCompleted={setupStatus.bank}
          />
        ) : null}

        {isOnline && availableRequests.length > 0 ? (
          <AppView className="mt-1 gap-3">
            <AppView row className="items-center justify-between px-1">
              <AppText className="text-[20px] font-black text-foreground">
                New delivery request
              </AppText>
              <AppPressable onPress={() => router.push('/(tabs)/orders')}>
                <AppText className="text-[13px] font-bold text-brand">View all</AppText>
              </AppPressable>
            </AppView>

            {availableRequests.map((request) => (
              <DeliveryRequestCard
                key={request.id}
                job={request}
                onAccept={handleAcceptJob}
                onDecline={declineJob}
              />
            ))}
          </AppView>
        ) : isOnline ? (
          <AppView className="items-center justify-center rounded-2xl border border-dashed border-border p-6">
            <Icon name="box.truck" size={32} tone="icon-subtle" />
            <AppText className="mt-2 text-[14px] font-bold text-foreground">
              Searching for orders nearby...
            </AppText>
            <AppText className="mt-1 text-center text-[12px] text-muted">
              Stay in high-demand zones to receive orders faster.
            </AppText>
          </AppView>
        ) : null}
      </AppScrollView>

      <WelcomeBonusModal
        visible={showBonusModal}
        onDismiss={() => {
          setShowBonusModal(false);
          dismissWelcomeBonus();
        }}
      />
    </AppView>
  );
}
