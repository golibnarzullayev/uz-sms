import { SmsError } from "../errors.js";

/**
 * Normalize an Uzbek phone number to bare `998XXXXXXXXX` (12 digits).
 *
 * Accepts `+998 90 123 45 67`, `998901234567`, `90 123-45-67`, etc.
 * A 9-digit national number is assumed to be Uzbek and prefixed with `998`.
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D+/g, "");

  let national: string;
  if (digits.length === 12 && digits.startsWith("998")) {
    national = digits.slice(3);
  } else if (digits.length === 9) {
    national = digits;
  } else {
    throw new SmsError(
      `Invalid Uzbek phone number: "${input}" (expected 998XXXXXXXXX or 9-digit national form)`,
    );
  }

  return `998${national}`;
}
