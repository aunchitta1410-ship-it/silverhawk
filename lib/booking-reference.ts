
import { randomInt } from "node:crypto";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function createBookingReference(
  nationalityCode: string
): string {
  const country = nationalityCode.trim().toUpperCase();

  // Expect a two-letter country/nationality code, e.g. TH, CN
  if (!/^[A-Z]{2}$/.test(country)) {
    throw new Error("Invalid nationality code");
  }

  let suffix = "";

  for (let i = 0; i < 6; i++) {
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }

  return `SH-${country}-${suffix}`;
}
