/** Company rules shared by fleet sign-up and the Company details screen. */
export const COMPANY_TYPES = [
  'Fleet Owner / Transport',
  'Proprietorship',
  'Private Limited',
  'Partnership',
  'LLP',
  'Individual Fleet',
];

export const DEFAULT_COMPANY_TYPE = COMPANY_TYPES[0];

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGstin(value: string): boolean {
  return GSTIN_PATTERN.test(value.trim().toUpperCase());
}
