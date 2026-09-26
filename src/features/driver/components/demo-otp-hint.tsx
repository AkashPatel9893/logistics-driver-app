import { AppText, AppView, Icon } from '@/components/ui';

export interface DemoOtpHintProps {
  who: 'sender' | 'receiver';
  otp: string | undefined;
}

/**
 * Demo builds only: shows the code the customer would read out from their
 * app, since there is no shared backend connecting the two apps yet.
 */
export function DemoOtpHint({ who, otp }: DemoOtpHintProps) {
  if (!otp) return null;
  return (
    <AppView
      row
      className="items-center gap-2 self-center rounded-full bg-surface-muted px-3 py-1.5"
    >
      <Icon name="lock.fill" size={12} tone="icon-subtle" />
      <AppText className="text-[12px] font-medium text-muted">
        Demo mode · {who}&apos;s code is{' '}
        <AppText className="text-[12px] font-bold text-foreground">{otp}</AppText>
      </AppText>
    </AppView>
  );
}
