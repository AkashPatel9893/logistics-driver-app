import { useRouter } from 'expo-router';
import { Modal } from 'react-native';

import { AppPressable, AppText, AppView, Button, Icon } from '@/components/ui';
import type { WelcomeBonus } from '@/lib/api/models';
import { formatRupees, formatShortDate } from '@/lib/format';

export interface WelcomeBonusModalProps {
  bonus: WelcomeBonus;
  visible: boolean;
  onDismiss: () => void;
}

export function WelcomeBonusModal({ bonus, visible, onDismiss }: WelcomeBonusModalProps) {
  const router = useRouter();
  if (!visible) return null;

  const left = Math.max(0, bonus.targetTrips - bonus.completedTrips);
  const progressPct = Math.round((bonus.completedTrips / bonus.targetTrips) * 100);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <AppView className="flex-1 items-center justify-center bg-black/60 px-6">
        <AppView className="w-full max-w-[360px] overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-2xl dark:bg-neutral-900">
          <AppView className="items-center">
            <AppView className="mb-3 h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
              <Icon name="gift.fill" size={36} color="#f59e0b" />
            </AppView>
            <AppView className="rounded-full bg-amber-500/15 px-3 py-1">
              <AppText className="text-[12px] font-bold text-amber-600 dark:text-amber-400">
                NEW PARTNER OFFER
              </AppText>
            </AppView>
            <AppText className="mt-3 text-center text-[24px] font-black text-foreground">
              {formatRupees(bonus.amount)} Welcome Bonus
            </AppText>
            <AppText className="mt-2 text-center text-[14px] leading-5 text-muted">
              Complete {bonus.targetTrips} deliveries by {formatShortDate(bonus.expiresAt)} and{' '}
              {formatRupees(bonus.amount)} is added to your wallet automatically.
            </AppText>
          </AppView>

          <AppView className="mt-5 rounded-2xl bg-surface-muted p-3.5">
            <AppView row className="items-center justify-between">
              <AppText className="text-[12px] font-semibold text-foreground-secondary">
                {bonus.completedTrips} of {bonus.targetTrips} completed
              </AppText>
              <AppText className="text-[12px] font-bold text-brand">{left} left</AppText>
            </AppView>
            <AppView className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <AppView
                style={{ width: `${Math.max(progressPct, 3)}%` }}
                className="h-full rounded-full bg-brand"
              />
            </AppView>
          </AppView>

          <AppView className="mt-6 gap-3">
            <Button label="Got it" onPress={onDismiss} size="lg" textClassName="font-bold" />
            <AppPressable
              onPress={() => {
                onDismiss();
                router.push('/earnings');
              }}
              className="items-center py-2.5 active:opacity-70"
            >
              <AppText className="text-[14px] font-semibold text-muted">View earnings</AppText>
            </AppPressable>
          </AppView>
        </AppView>
      </AppView>
    </Modal>
  );
}
