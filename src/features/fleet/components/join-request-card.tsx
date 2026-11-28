import { AppText, AppView, Button } from '@/components/ui';
import type { LinkRequestResponse } from '@/lib/api/fleet';

export interface JoinRequestCardProps {
  request: LinkRequestResponse;
  busy: boolean;
  onApprove: () => void;
  onDecline: () => void;
}

export function JoinRequestCard({ request, busy, onApprove, onDecline }: JoinRequestCardProps) {
  return (
    <AppView className="gap-3 rounded-3xl border border-brand/40 bg-card p-4">
      <AppView>
        <AppText className="text-[16px] font-black text-foreground">{request.driver.name}</AppText>
        <AppText className="mt-0.5 text-[13px] text-muted">{request.driver.phone}</AppText>
        {request.note ? (
          <AppText className="mt-1 text-[13px] text-foreground-secondary">{request.note}</AppText>
        ) : null}
      </AppView>
      <AppView row className="gap-3">
        <Button
          variant="outline"
          size="sm"
          label="Decline"
          className="flex-1"
          disabled={busy}
          onPress={onDecline}
        />
        <Button
          variant="brand"
          size="sm"
          label="Approve"
          className="flex-1"
          disabled={busy}
          onPress={onApprove}
        />
      </AppView>
    </AppView>
  );
}
