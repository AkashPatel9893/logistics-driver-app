import { Modal } from 'react-native';

import { AppPressable, AppText, AppView, Button, Icon, type IconName } from '@/components/ui';

export interface DriverOption {
  key: string;
  icon: IconName;
  title: string;
  detail: string;
  danger?: boolean;
  onPress: () => void;
}

export interface DriverOptionsSheetProps {
  visible: boolean;
  title: string;
  options: DriverOption[];
  busy?: boolean;
  onClose: () => void;
}

/** What the fleet owner can do about a vehicle's driver, as a bottom sheet. */
export function DriverOptionsSheet({
  visible,
  title,
  options,
  busy = false,
  onClose,
}: DriverOptionsSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <AppView className="flex-1 justify-end bg-black/40">
        <AppView className="rounded-t-3xl bg-background px-5 pb-8 pt-5">
          <AppText className="text-[18px] font-extrabold text-foreground">{title}</AppText>
          <AppText className="mb-4 mt-1 text-[13px] text-muted">
            A vehicle has one driver, and a driver has one vehicle.
          </AppText>

          <AppView className="gap-2.5">
            {options.map((option) => (
              <AppPressable
                key={option.key}
                onPress={option.onPress}
                disabled={busy}
                pressScale={0.98}
                accessibilityRole="button"
                className={`flex-row items-center gap-3 rounded-2xl border p-3.5 ${
                  option.danger ? 'border-red-500/20 bg-red-500/5' : 'border-border bg-card'
                }`}
              >
                <Icon name={option.icon} size={20} tone={option.danger ? 'error' : 'brand'} />
                <AppView className="flex-1">
                  <AppText
                    className={`text-[14px] font-bold ${
                      option.danger ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                    }`}
                  >
                    {option.title}
                  </AppText>
                  <AppText className="text-[11px] text-muted">{option.detail}</AppText>
                </AppView>
              </AppPressable>
            ))}
          </AppView>

          <Button variant="outline" label="Cancel" className="mt-4" onPress={onClose} />
        </AppView>
      </AppView>
    </Modal>
  );
}
