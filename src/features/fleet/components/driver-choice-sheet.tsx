import { Modal } from 'react-native';

import { AppPressable, AppText, AppView, Button, Icon } from '@/components/ui';

export interface DriverChoiceSheetProps {
  visible: boolean;
  /** e.g. "Tata Ace (KA03MX2814)": the vehicle that was just saved. */
  vehicleLabel: string;
  busy?: boolean;
  onDriveMyself: () => void;
  onAddDriver: () => void;
  onLater: () => void;
}

/** Shown right after a fleet owner saves a vehicle: who will drive it. */
export function DriverChoiceSheet({
  visible,
  vehicleLabel,
  busy = false,
  onDriveMyself,
  onAddDriver,
  onLater,
}: DriverChoiceSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onLater}>
      <AppView className="flex-1 justify-end bg-black/40">
        <AppView className="rounded-t-3xl bg-background px-5 pb-8 pt-5">
          <AppText className="text-[18px] font-extrabold text-foreground">
            Who will drive this vehicle?
          </AppText>
          <AppText className="mb-4 mt-1 text-[13px] text-muted">
            {vehicleLabel} is saved. A vehicle has one driver at a time.
          </AppText>

          <AppView className="gap-2.5">
            <AppPressable
              onPress={onDriveMyself}
              disabled={busy}
              pressScale={0.98}
              className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-3.5 active:bg-neutral-100 dark:active:bg-neutral-800"
            >
              <AppView row className="items-center gap-3">
                <Icon name="steeringwheel" size={20} tone="brand" />
                <AppView>
                  <AppText className="text-[14px] font-bold text-foreground">
                    {busy ? 'Assigning…' : 'I will drive myself'}
                  </AppText>
                  <AppText className="text-[11px] text-muted">Owner self-drive mode</AppText>
                </AppView>
              </AppView>
              <Icon name="chevron.right" size={16} tone="icon-subtle" />
            </AppPressable>

            <AppPressable
              onPress={onAddDriver}
              disabled={busy}
              pressScale={0.98}
              className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-3.5 active:bg-neutral-100 dark:active:bg-neutral-800"
            >
              <AppView row className="items-center gap-3">
                <Icon name="person.badge.plus" size={20} tone="foreground" />
                <AppView>
                  <AppText className="text-[14px] font-bold text-foreground">Add a driver</AppText>
                  <AppText className="text-[11px] text-muted">
                    Enter full name, DL, and phone
                  </AppText>
                </AppView>
              </AppView>
              <Icon name="chevron.right" size={16} tone="icon-subtle" />
            </AppPressable>
          </AppView>

          <Button variant="outline" label="Later" className="mt-4" onPress={onLater} />
        </AppView>
      </AppView>
    </Modal>
  );
}
