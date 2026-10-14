import baggage from "./json/BAGGAGE_OPTIONS.json";
import meals from "./json/MEAL_OPTIONS.json";
import assistance from "./json/ASSISTANCE_OPTIONS.json";

export interface BaggageOption {
  id: string;
  label: string;
  kg: number;
  price: number;
  note: string;
}

export interface MealOption {
  id: string;
  label: string;
  /** IATA special-meal code, e.g. MOML for halal. */
  code: string;
  description: string;
  price: number;
  /** Only offered to this passenger type (child and infant meals). */
  for?: "child" | "infant";
}

export interface AssistanceOption {
  id: string;
  label: string;
  /** IATA SSR code, e.g. WCHR. */
  code: string;
  description: string;
}

export const BAGGAGE_OPTIONS = baggage as unknown as BaggageOption[];
export const MEAL_OPTIONS = meals as unknown as MealOption[];
export const ASSISTANCE_OPTIONS = assistance as unknown as AssistanceOption[];

export const baggageOptionById = (id: string) => BAGGAGE_OPTIONS.find((o) => o.id === id);
export const mealOptionById = (id: string) => MEAL_OPTIONS.find((o) => o.id === id);

export const SEAT_KIND_LABEL = { standard: "Standard", extra_legroom: "Extra legroom", premium: "Preferred" } as const;
