import countries from "./json/COUNTRIES.json";

export interface Country {
  code: string;
  name: string;
  dial: string;
}

/** Nationality / issuing-country list, in the original order (UK and Gulf first). */
export const COUNTRIES = countries as Country[];
/** One entry per dialling code. The US and Canada share +1, which shows as "+1 (CA)", as in the original. */
export const DIAL_CODES = Array.from(new Map(COUNTRIES.map((c) => [c.dial, c])).values());
export const countryName = (code: string) => COUNTRIES.find((c) => c.code === code)?.name ?? code;
