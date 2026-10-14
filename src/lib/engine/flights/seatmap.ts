import { createRng } from "@/lib/engine/rng";
import type { Cabin, Fare, Segment } from "@/lib/types/flights";

export type SeatKind = "standard" | "premium" | "extra_legroom";

export interface Seat {
  id: string;
  row: number;
  letter: string;
  kind: SeatKind;
  /** Price in GBP; 0 when included in the fare. */
  price: number;
  occupied: boolean;
  window: boolean;
  aisle: boolean;
}

export interface SeatRow {
  row: number;
  seats: Seat[];
  exit: boolean;
  wing: boolean;
  label?: "Exit row" | "Bulkhead";
}

export interface SeatMap {
  segmentId: string;
  aircraft: string;
  cabin: Cabin;
  /** Seat letters grouped by aisle, e.g. ["ABC", "DEFG", "HJK"]. */
  layout: string[];
  rows: SeatRow[];
}

interface CabinLayout {
  layout: string[];
  rows: [number, number];
  exit: number[];
  bulkhead: number;
  /** Rows just behind the bulkhead sold as "premium" standard seats. */
  preferredRows: number;
  wing: [number, number];
}

function layoutFor(aircraft: string, cabin: Cabin): CabinLayout {
  if (cabin === "premium_economy") return { layout: ["AB", "DEF", "JK"], rows: [20, 27], exit: [], bulkhead: 20, preferredRows: 0, wing: [22, 25] };
  if (cabin === "business") return { layout: ["A", "DG", "K"], rows: [1, 9], exit: [], bulkhead: 1, preferredRows: 0, wing: [4, 7] };
  if (cabin === "first") return { layout: ["A", "K"], rows: [1, 4], exit: [], bulkhead: 1, preferredRows: 0, wing: [2, 3] };
  if (/A380/.test(aircraft)) return { layout: ["ABC", "DEFG", "HJK"], rows: [36, 70], exit: [42, 55], bulkhead: 36, preferredRows: 3, wing: [45, 58] };
  if (/747|777|A340/.test(aircraft)) return { layout: ["ABC", "DEFG", "HJK"], rows: [30, 62], exit: [38, 47], bulkhead: 30, preferredRows: 3, wing: [40, 50] };
  if (/787|A350/.test(aircraft)) return { layout: ["ABC", "DEF", "HJK"], rows: [28, 58], exit: [36, 46], bulkhead: 28, preferredRows: 3, wing: [38, 48] };
  if (/A330/.test(aircraft)) return { layout: ["AB", "DEFG", "JK"], rows: [28, 56], exit: [35, 44], bulkhead: 28, preferredRows: 3, wing: [37, 46] };
  if (/A220/.test(aircraft)) return { layout: ["AC", "DEF"], rows: [8, 30], exit: [12, 13], bulkhead: 8, preferredRows: 2, wing: [12, 20] };
  if (/Embraer|E190|E195/.test(aircraft)) return { layout: ["AC", "DF"], rows: [6, 26], exit: [11, 12], bulkhead: 6, preferredRows: 2, wing: [10, 16] };
  return { layout: ["ABC", "DEF"], rows: [9, 33], exit: [14, 15], bulkhead: 9, preferredRows: 3, wing: [12, 22] };
}

/** Seat map for one segment. Prices depend on the chosen fare's seat-selection rule. */
export function buildSeatMap(segment: Pick<Segment, "id" | "aircraft" | "cabin">, fare: Pick<Fare, "seatSelection">): SeatMap {
  const cfg = layoutFor(segment.aircraft, segment.cabin);
  const rng = createRng(`seatmap-${segment.id}`);
  const letters = cfg.layout.join("");
  const premiumCabin = segment.cabin === "business" || segment.cabin === "first";
  const occupancy = premiumCabin ? 0.35 : segment.cabin === "premium_economy" ? 0.4 : 0.46;
  const blockEdges = cfg.layout.map((block) => [letters.indexOf(block[0]), letters.indexOf(block[block.length - 1])]);
  const rows: SeatRow[] = [];

  for (let row = cfg.rows[0]; row <= cfg.rows[1]; row++) {
    const exit = cfg.exit.includes(row);
    const bulkhead = row === cfg.bulkhead && segment.cabin === "economy";
    const seats: Seat[] = [];
    for (const letter of letters) {
      let kind: SeatKind = "standard";
      if (premiumCabin) kind = "premium";
      else if (segment.cabin === "premium_economy" || exit || bulkhead) kind = "extra_legroom";
      else if (row > cfg.bulkhead && row <= cfg.bulkhead + cfg.preferredRows) kind = "premium";

      let price = 0;
      if (!premiumCabin) {
        // Standard seats get cheaper towards the back of the cabin.
        if (kind === "standard") price = 12 + Math.round(((cfg.rows[1] - row) / (cfg.rows[1] - cfg.rows[0] + 1)) * 12);
        if (kind === "premium") price = 26 + rng.int(0, 6);
        if (kind === "extra_legroom") price = segment.cabin === "premium_economy" ? 0 : 42 + rng.int(0, 22);
        if (fare.seatSelection === "standard_free" && kind === "standard") price = 0;
        if (fare.seatSelection === "premium_free" && (kind === "standard" || kind === "premium")) price = 0;
        if (fare.seatSelection === "premium_free" && kind === "extra_legroom") price = Math.round(0.5 * price);
      }
      const index = letters.indexOf(letter);
      const window = index === 0 || index === letters.length - 1;
      const aisle = blockEdges.some(([start, end], b) => (b > 0 && index === start) || (b < blockEdges.length - 1 && index === end));
      seats.push({ id: `${row}${letter}`, row, letter, kind, price, occupied: rng.chance(occupancy), window, aisle });
    }
    rows.push({
      row,
      seats,
      exit,
      wing: row >= cfg.wing[0] && row <= cfg.wing[1],
      label: exit ? "Exit row" : bulkhead ? "Bulkhead" : undefined,
    });
  }
  return { segmentId: segment.id, aircraft: segment.aircraft, cabin: segment.cabin, layout: cfg.layout, rows };
}
