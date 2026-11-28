import { AppPressable, AppText, AppView } from '@/components/ui';
import type { FleetMemberResponse } from '@/lib/api/fleet';

import { memberStatusText } from '../fleet-members';

export interface FleetMemberCardProps {
  member: FleetMemberResponse;
  busy: boolean;
  onAssign: () => void;
  /** Cancels the invite, or takes a joined driver out of the fleet. */
  onRemove: () => void;
  /** Invited, not joined: let the owner message the driver themselves. */
  onShareInvite?: () => void;
}

export function FleetMemberCard({
  member,
  busy,
  onAssign,
  onRemove,
  onShareInvite,
}: FleetMemberCardProps) {
  const isInvited = Boolean(member.invite_id);

  return (
    <AppView className="gap-3 rounded-3xl border border-border bg-card p-4">
      <AppView>
        <AppText className="text-[16px] font-black text-foreground">{member.name}</AppText>
        <AppText className="mt-0.5 text-[13px] text-muted">{member.phone}</AppText>
        <AppText className="mt-1.5 text-[13px] font-bold text-foreground-secondary">
          {member.vehicle ? `Vehicle ${member.vehicle.registration_number}` : 'No vehicle'}
        </AppText>
        <AppText className="text-[12px] text-muted">{memberStatusText(member)}</AppText>
      </AppView>
      <AppView row className="items-center justify-end gap-5">
        <AppPressable onPress={onRemove} disabled={busy} hitSlop={10} accessibilityRole="button">
          <AppText className="text-[13px] font-bold text-red-600 dark:text-red-400">
            {isInvited ? 'Cancel invite' : 'Remove from fleet'}
          </AppText>
        </AppPressable>
        {isInvited && onShareInvite ? (
          <AppPressable
            onPress={onShareInvite}
            disabled={busy}
            hitSlop={10}
            accessibilityRole="button"
          >
            <AppText className="text-[13px] font-bold text-brand">Share invite</AppText>
          </AppPressable>
        ) : null}
        {!isInvited && !member.vehicle ? (
          <AppPressable onPress={onAssign} disabled={busy} hitSlop={10} accessibilityRole="button">
            <AppText className="text-[13px] font-bold text-brand">Assign vehicle</AppText>
          </AppPressable>
        ) : null}
      </AppView>
    </AppView>
  );
}
