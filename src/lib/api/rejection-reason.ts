/** Why the verification provider refused a document, in words for the driver. */
const PROVIDER_REASONS: Record<string, string> = {
  MISMATCH: "The details don't match the document. Check the number and your name.",
  EXPIRED: 'This document has expired. Upload a valid one.',
  INVALID_INPUT: 'The number you entered is not valid. Check it and try again.',
  DOCUMENT_NOT_FOUND: 'No record was found for this number. Check it and try again.',
};

/** A machine code such as INVALID_INPUT, as opposed to a sentence typed by a reviewer. */
const CODE_PATTERN = /^[A-Z0-9]+(_[A-Z0-9]+)*$/;

/**
 * The backend's `rejection_reason` as text to show: a known code is translated, a reviewer's own
 * words are kept, and an unknown code gives null so the screen uses its general message.
 */
export function rejectionMessage(reason: string | null | undefined): string | null {
  const text = reason?.trim();
  if (!text) return null;
  return PROVIDER_REASONS[text] ?? (CODE_PATTERN.test(text) ? null : text);
}
