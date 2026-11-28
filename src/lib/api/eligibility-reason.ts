/**
 * Why the backend will not let a driver go online (`GET /partner/eligibility` reasons, or the
 * `DRIVER_NOT_ELIGIBLE` error), in words for the driver.
 */

const DOC_NAMES: Record<string, string> = {
  DRIVING_LICENCE: 'driving licence',
  PAN: 'PAN card',
  AADHAAR: 'Aadhaar',
  SELFIE: 'profile photo',
  RC: 'RC',
  INSURANCE: 'insurance',
  PUC: 'pollution certificate',
  FITNESS: 'fitness certificate',
  STATE_PERMIT: 'permit',
  NATIONAL_PERMIT: 'permit',
};

const FIXED: Record<string, string | null> = {
  // Shown by the application status instead.
  ONBOARDING_NOT_APPROVED: null,
  BANK_ACCOUNT_NOT_VERIFIED: 'Your bank account is not verified yet. Check Bank details.',
  NO_ACTIVE_VEHICLE_ASSIGNMENT:
    'You have no vehicle to drive yet. Add your vehicle, or ask your fleet owner to assign one.',
  VEHICLE_ASSIGNMENT_NOT_IN_VALIDITY:
    'Your vehicle assignment is not active right now. Ask your fleet owner.',
  VEHICLE_NOT_ACTIVE: 'Your vehicle is waiting for approval by Ryno.',
  VEHICLE_TYPE_INACTIVE: 'Ryno is not taking bookings for your vehicle type right now.',
  OWNER_AUTHORIZATION_INCOMPLETE:
    "The vehicle owner's permission is not complete yet. Open My vehicle.",
  OWNER_AUTHORIZATION_EXPIRED:
    "The vehicle owner's permission has expired. Open My vehicle to renew it.",
  DRIVER_SUSPENDED: 'Your account is suspended. Contact support.',
  DRIVER_ACCOUNT_NOT_ACTIVE: 'Your account is not active. Contact support.',
  USER_ACCOUNT_NOT_ACTIVE: 'Your account is not active. Contact support.',
  MARKET_INACTIVE: 'Ryno is not running in your city yet.',
};

const PROBLEM: Record<string, string> = {
  MISSING: 'is missing',
  EXPIRED: 'has expired',
  NOT_VERIFIED: 'is not verified yet',
};

const GENERAL = 'You cannot go online right now. Contact support.';

function docMessage(reason: string, fleetVehicle: boolean): string | undefined {
  // DRIVER_DOC_EXPIRED:PAN, VEHICLE_DOC_MISSING:NATIONAL_PERMIT
  const match = /^(DRIVER|VEHICLE)_DOC_(MISSING|EXPIRED|NOT_VERIFIED):([A-Z_|]+)$/.exec(reason);
  if (!match) return undefined;
  const [, owner, problem, types] = match;
  const name = DOC_NAMES[types.split('|')[0]] ?? 'document';
  if (owner === 'DRIVER') return `Your ${name} ${PROBLEM[problem]}. Open My documents.`;
  return fleetVehicle
    ? `The vehicle's ${name} ${PROBLEM[problem]}. Your fleet owner looks after its papers.`
    : `Your vehicle's ${name} ${PROBLEM[problem]}. Open My vehicle.`;
}

/**
 * One message per reason, in the backend's order, without repeats. Unknown codes give one general
 * line, never the raw code.
 */
export function eligibilityMessages(
  reasons: string[],
  options: { fleetVehicle?: boolean } = {},
): string[] {
  const out: string[] = [];
  for (const reason of reasons) {
    const text =
      reason in FIXED
        ? FIXED[reason]
        : (docMessage(reason, options.fleetVehicle === true) ?? GENERAL);
    if (text && !out.includes(text)) out.push(text);
  }
  return out;
}

/** The reasons as one short text (at most three), or null when there is nothing to say. */
export function eligibilityMessage(
  reasons: string[],
  options: { fleetVehicle?: boolean } = {},
): string | null {
  const messages = eligibilityMessages(reasons, options);
  if (messages.length === 0) return null;
  const shown = messages.slice(0, 3).join(' ');
  return messages.length > 3 ? `${shown} And ${messages.length - 3} more.` : shown;
}
