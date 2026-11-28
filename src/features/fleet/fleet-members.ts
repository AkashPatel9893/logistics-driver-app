import type { FleetMemberResponse } from '@/lib/api/fleet';

const STATUS_TEXT: Record<NonNullable<FleetMemberResponse['status']>, string> = {
  INVITED: 'Invited, not joined yet',
  ONBOARDING: 'Completing their documents',
  PENDING_APPROVAL: 'Waiting for Ryno approval',
  ACTIVE: 'Active',
  UNASSIGNED: 'Approved',
};

export const memberStatusText = (member: FleetMemberResponse) =>
  member.status ? STATUS_TEXT[member.status] : '';

/** Drivers other than the owner who have joined: the ones that can be put on a vehicle by id. */
export const joinedDrivers = (members: FleetMemberResponse[]) =>
  members.filter((member) => !member.is_owner_self && !member.invite_id);

export const lastTenDigits = (value: string) => value.replace(/\D/g, '').slice(-10);
