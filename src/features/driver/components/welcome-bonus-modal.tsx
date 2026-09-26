import { useRouter } from 'expo-router';
import { Modal } from 'react-native';

import { AppPressable, AppText, AppView, Button, Icon } from '@/components/ui';

export interface WelcomeBonusModalProps {
  visible: boolean;
  onDismiss: () => void;
  onClaim?: () => void;
}

export function WelcomeBonusModal({ visible, onDismiss, onClaim }: WelcomeBonusModalProps) {
  const router = useRouter();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <AppView className="flex-1 items-center justify-center bg-black/60 px-6">
        <AppView className="w-full max-w-[360px] overflow-hidden rounded-3xl border border-border bg-white dark:bg-neutral-900 p-6 shadow-2xl">
          {/* Header icon / badge */}
          <AppView className="items-center">
            <AppView className="mb-3 h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
              <Icon name="gift.fill" size={36} color="#f59e0b" />
            </AppView>
            <AppView className="rounded-full bg-amber-500/15 px-3 py-1">
              <AppText className="text-[12px] font-bold text-amber-600 dark:text-amber-400">
                SPECIAL OFFER
              </AppText>
            </AppView>
            <AppText className="mt-3 text-center text-[24px] font-black text-foreground">
              ₹1,000 Welcome Bonus
            </AppText>
            <AppText className="mt-2 text-center text-[14px] leading-5 text-muted">
              Complete 15 deliveries in your first 7 days to unlock your ₹1,000 bonus reward.
            </AppText>
          </AppView>

          {/* Progress bar mock */}
          <AppView className="mt-5 rounded-2xl bg-surface-muted p-3.5">
            <AppView row className="items-center justify-between">
              <AppText className="text-[12px] font-semibold text-foreground-secondary">
                Progress: 2 of 15 completed
              </AppText>
              <AppText className="text-[12px] font-bold text-brand">13 left</AppText>
            </AppView>
            <AppView className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <AppView className="h-full w-[13%] rounded-full bg-brand" />
            </AppView>
          </AppView>

          {/* Action buttons */}
          <AppView className="mt-6 gap-3">
            <Button
              label="View wallet"
              onPress={() => {
                onDismiss();
                router.push('/wallet');
              }}
              size="lg"
              textClassName="font-bold"
            />
            <AppPressable onPress={onDismiss} className="items-center py-2.5 active:opacity-70">
              <AppText className="text-[14px] font-semibold text-muted">Dismiss</AppText>
            </AppPressable>
          </AppView>
        </AppView>
      </AppView>
    </Modal>
  );
}
