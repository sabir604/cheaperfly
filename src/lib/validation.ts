/** Form validation rules shared by checkout, account and support forms (messages match the original). */
import { addMonths, differenceInYears, isBefore } from "date-fns";
import { z } from "zod";
import { parseDate } from "@/lib/engine/dates";

export const TITLES = { adult: ["Mr", "Mrs", "Ms", "Miss", "Dr"], child: ["Master", "Miss"], infant: ["Master", "Miss"] } as const;

const NAME_PATTERN = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'’-]*$/;

/** Passport-style name: 2+ letters, no digits or symbols. `what` is e.g. "first name". */
export const nameField = (what: string) =>
  z
    .string()
    .trim()
    .min(2, `Enter ${what} as shown on the passport`)
    .regex(NAME_PATTERN, "Use letters only — no numbers or symbols");

export const emailField = z.string().trim().min(1, "Enter your email address").email("Enter a valid email address");

export const contactSchema = z.object({
  email: emailField,
  countryCode: z.string().min(1, "Choose a country code"),
  mobile: z
    .string()
    .trim()
    .min(1, "Enter your mobile number")
    .regex(/^[0-9\s-]{6,14}$/, "Enter a valid mobile number (digits only)"),
});

export const strongPassword = z
  .string()
  .min(8, "Use at least 8 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[0-9]/, "Include a number");

/** Whole years between a date of birth and a travel date; null if either is invalid. */
function ageOn(dob: string, onDate: string): number | null {
  const birth = parseDate(dob);
  const on = parseDate(onDate);
  return birth && on ? differenceInYears(on, birth) : null;
}

/**
 * Passenger schema. Age rules apply at `firstTravelDate` (infants must also be under 2 on `lastTravelDate`),
 * and the passport must not expire before `lastTravelDate`.
 */
export function makePassengerSchema(firstTravelDate: string, lastTravelDate: string, requirePassport = true) {
  return z
    .object({
      id: z.string(),
      type: z.enum(["adult", "child", "infant"]),
      title: z.string().min(1, "Select a title"),
      firstName: nameField("first name"),
      middleName: z.string().trim().optional(),
      lastName: nameField("last name"),
      dob: z.string().min(1, "Enter date of birth"),
      gender: z.string().min(1, "Select gender"),
      nationality: z.string().min(1, "Select nationality"),
      passportNo: requirePassport
        ? z
            .string()
            .trim()
            .min(6, "Passport numbers have 6–9 characters")
            .max(9, "Passport numbers have 6–9 characters")
            .regex(/^[A-Za-z0-9]+$/, "Letters and numbers only")
        : z.string().optional(),
      passportCountry: requirePassport ? z.string().min(1, "Select the issuing country") : z.string().optional(),
      passportExpiry: requirePassport ? z.string().min(1, "Enter the expiry date") : z.string().optional(),
      frequentFlyer: z.string().trim().optional(),
      savedTravellerId: z.string().optional(),
    })
    .superRefine((p, ctx) => {
      if (p.dob) {
        const birth = parseDate(p.dob);
        if (!birth) ctx.addIssue({ code: "custom", path: ["dob"], message: "Enter a valid date" });
        else if (birth > new Date()) ctx.addIssue({ code: "custom", path: ["dob"], message: "Date of birth can't be in the future" });
        else {
          const age = ageOn(p.dob, firstTravelDate);
          if (age !== null) {
            if (p.type === "adult" && age < 12) ctx.addIssue({ code: "custom", path: ["dob"], message: "Adults must be 12 or older at the time of travel" });
            if (p.type === "child" && (age < 2 || age > 11)) ctx.addIssue({ code: "custom", path: ["dob"], message: "Children must be aged 2–11 at the time of travel" });
            if (p.type === "infant") {
              const ageAtEnd = ageOn(p.dob, lastTravelDate);
              if (age >= 2 || (ageAtEnd !== null && ageAtEnd >= 2))
                ctx.addIssue({ code: "custom", path: ["dob"], message: "Infants must be under 2 for the whole journey" });
            }
          }
        }
      }
      if (requirePassport && p.passportExpiry) {
        const expiry = parseDate(p.passportExpiry);
        const end = parseDate(lastTravelDate);
        if (!expiry) ctx.addIssue({ code: "custom", path: ["passportExpiry"], message: "Enter a valid date" });
        else if (end && isBefore(expiry, end))
          ctx.addIssue({ code: "custom", path: ["passportExpiry"], message: "Passport expires before your trip ends — renew it before travelling" });
      }
    });
}

/** Soft warning when a passport expires within 6 months of the return date. */
export function passportWarning(expiry: string, returnDate: string): string | null {
  const e = parseDate(expiry);
  const r = parseDate(returnDate);
  if (!e || !r || isBefore(e, r)) return null;
  return isBefore(e, addMonths(r, 6))
    ? "This passport expires within 6 months of your return. Many countries (including the UAE and Saudi Arabia) require at least 6 months' validity."
    : null;
}
