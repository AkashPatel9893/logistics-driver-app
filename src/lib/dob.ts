const DOB_PATTERN = /^(\d{2}) \/ (\d{2}) \/ (\d{4})$/;
const MINIMUM_AGE = 18;

/** Checks a "DD / MM / YYYY" date of birth. Returns the message to show, or undefined when valid. */
export function getDobError(dob: string): string | undefined {
  const match = DOB_PATTERN.exec(dob.trim());
  if (!match) return 'Enter your date of birth as DD / MM / YYYY';

  const [day, month, year] = match.slice(1).map(Number);
  const birthDate = new Date(year, month - 1, day);
  // JavaScript rolls impossible dates forward (31 Feb becomes early March), so compare the parts.
  const isRealDate =
    birthDate.getFullYear() === year &&
    birthDate.getMonth() === month - 1 &&
    birthDate.getDate() === day;
  const today = new Date();
  if (!isRealDate || year < 1900 || birthDate > today) return 'Enter a valid date of birth';

  const birthdayNotReached =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  const age = today.getFullYear() - year - (birthdayNotReached ? 1 : 0);
  return age < MINIMUM_AGE ? `Must be at least ${MINIMUM_AGE} years old` : undefined;
}
