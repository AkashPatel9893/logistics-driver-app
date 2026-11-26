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

/** Feb 29 stays allowed until the year is typed. */
const MAX_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Checks a date of birth while it is being typed, one part at a time: day, then month, then
 * year, and the whole date once all eight digits are in. Returns the message to show under the
 * field, or undefined while what is typed so far is fine.
 */
export function getDobTypingError(dob: string): string | undefined {
  const digits = dob.replace(/\D/g, '');
  const day = Number(digits.slice(0, 2));
  if (digits.length >= 2 && (day < 1 || day > 31)) return 'Day must be between 01 and 31';

  const month = Number(digits.slice(2, 4));
  if (digits.length >= 4) {
    if (month < 1 || month > 12) return 'Month must be between 01 and 12';
    if (day > MAX_DAYS[month - 1]) return `That month has only ${MAX_DAYS[month - 1]} days`;
  }

  const year = digits.slice(4);
  if (year.length >= 1 && !/^[12]/.test(year)) return 'Enter a valid year';
  if (year.length >= 2 && !/^(19|20)/.test(year)) return 'Enter a valid year';

  if (digits.length === 8) {
    if (day === 29 && month === 2) {
      const y = Number(year);
      const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
      if (!leap) return `February had only 28 days in ${year}`;
    }
    return getDobError(`${digits.slice(0, 2)} / ${digits.slice(2, 4)} / ${digits.slice(4)}`);
  }
  return undefined;
}

/** For when the field is left: anything typed but not finished is an error. */
export function getDobBlurError(dob: string): string | undefined {
  if (dob.replace(/\D/g, '').length === 0) return undefined;
  return (
    getDobTypingError(dob) ??
    (dob.replace(/\D/g, '').length < 8 ? 'Enter your date of birth as DD / MM / YYYY' : undefined)
  );
}
