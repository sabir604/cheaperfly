/** Reference number generators. Random unless a seed is given (seeds make demo data stable). */
import { createRng } from "@/lib/engine/rng";

/** No 0/O, 1/I: easy to read aloud over the phone. */
const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DIGITS = "0123456789";

function randomString(length: number, alphabet: string, seed?: string): string {
  const rng = createRng(seed ?? `${Date.now()}-${Math.random()}`);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(rng.next() * alphabet.length)];
  return out;
}

export const newId = (prefix = "id") => `${prefix}_${randomString(10, ALPHANUM.toLowerCase() + DIGITS)}`;
/** `CF-123456` */
export const newBookingRef = (seed?: string) => `CF-${randomString(6, DIGITS, seed)}`;
/** `RF-12345`, `CH-12345`, `SP-12345` */
export const newCaseRef = (prefix: string, seed?: string) => `${prefix}-${randomString(5, DIGITS, seed)}`;
/** `HC12345678` */
export const newHotelConfirmation = (seed?: string) => `HC${randomString(8, DIGITS, seed)}`;
/** `INV-2026-123456` */
export const newInvoiceNo = (seed?: string) => `INV-${new Date().getFullYear()}-${randomString(6, DIGITS, seed)}`;
/** Airline record locator, e.g. `KF4TTG`. */
export const newPnr = (seed?: string) => randomString(6, ALPHANUM, seed ? seed + "pnr" : undefined);
/** `176-1234567890`: airline numeric code + 10 digits. */
export const newTicketNumber = (airlineNumeric: string, seed?: string) => `${airlineNumeric}-${randomString(10, DIGITS, seed ? seed + "tkt" : undefined)}`;
export const newTxnId = (seed?: string) => `TXN-${randomString(10, ALPHANUM, seed ? seed + "txn" : undefined)}`;
