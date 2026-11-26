import type { DriverProfile } from '@/lib/api/models';

export interface ModeSwitchState {
  /** True only once the admin has approved the driver profile. */
  allowed: boolean;
  /** Why it is locked (shown under the switch); null when allowed or while the profile is loading. */
  lockedReason: string | null;
}

export const LOCKED_MESSAGE =
  'Switching between Driver and Fleet Owner unlocks after the admin has verified your account.';

/** Switching modes needs the admin's approval of the driver profile. Until then the switch stays locked. */
export function modeSwitchState(
  profile: Pick<DriverProfile, 'onboarding'> | null | undefined,
): ModeSwitchState {
  if (!profile) return { allowed: false, lockedReason: null };
  const approved = profile.onboarding.status === 'approved';
  return { allowed: approved, lockedReason: approved ? null : LOCKED_MESSAGE };
}

/**
 * Label for the link shown to a Fleet Owner while the switch is locked: it opens driver registration, the one
 * way to become a verified driver (and so unlock the switch). Follows the state of the driver application.
 */
export function registrationLinkLabel(
  profile: Pick<DriverProfile, 'onboarding'> | null | undefined,
): string {
  switch (profile?.onboarding.status) {
    case 'submitted':
      return 'Driver application is under review';
    case 'rejected':
      return 'Update your driver application';
    default:
      return 'Register as a driver';
  }
}

/**
 * The Ryno ID card identifies a driver: always for a rider, and for a fleet owner only once they
 * are approved to drive (before that it would show "not approved" with no vehicle or licence).
 */
export function showsDriverId(
  profile: Pick<DriverProfile, 'onboarding'> | null | undefined,
  isOwner: boolean,
): boolean {
  return !isOwner || modeSwitchState(profile).allowed;
}
