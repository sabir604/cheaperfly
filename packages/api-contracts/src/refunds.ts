import type { Booking } from "./booking";
export type RefundUnit = {
  id: string;
  name: string;
  grossMinor: number;
  netMinor: number;
  gbpMinor: number;
};
/** Stable integer allocation; the remainder goes to the earliest nonzero weights. */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) return weights.map(() => 0);
  const values = weights.map((w) => Math.floor((total * w) / sum));
  let remainder = total - values.reduce((a, b) => a + b, 0);
  for (let i = 0; remainder > 0; i = (i + 1) % weights.length)
    if (weights[i] > 0) {
      values[i]++;
      remainder--;
    }
  return values;
}
/** Simulated policy, derived only from the original paid snapshot and its captured FX rate. */
export function refundUnits(
  b: Booking,
  fxRate = 1,
  accountingMinor = Math.round(b.pricing.total * 100),
  today = new Date().toISOString().slice(0, 10),
): RefundUnit[] {
  const people =
    b.product === "flight"
      ? b.passengers
      : b.product === "umrah"
        ? b.travellers
        : [{ id: "stay", firstName: "Entire", lastName: "stay" }];
  const total = Math.round(b.pricing.total * 100);
  let weights: number[], eligible: number[];
  if (b.product === "flight") {
    const weightsByType = { adult: 1, child: 0.75, infant: 0.1 };
    weights = b.passengers.map((p) => weightsByType[p.type]);
    const bases = b.passengers.map((p) => {
      const line = b.pricing.lines.find((l) => l.id === `base-${p.type}`);
      const count = b.passengers.filter((x) => x.type === p.type).length;
      return line ? Math.round((line.amount * 100) / count) : 0;
    });
    if (!bases.some((v) => v > 0))
      bases.splice(
        0,
        bases.length,
        ...allocate(Math.round(b.pricing.base * 100), weights),
      );
    const taxes = allocate(
      Math.round(b.pricing.taxes * 100),
      b.passengers.map((p) => (p.type === "infant" ? 0.4 : 1)),
    );
    const discounts = allocate(Math.round(b.pricing.discount * 100), bases);
    weights = bases.map((v, i) => v + taxes[i]);
    eligible = b.passengers.map((_, i) =>
      Math.max(
        0,
        (b.fare.refundFee === null ? 0 : bases[i]) +
          taxes[i] -
          discounts[i] -
          Math.round((b.fare.refundFee ?? 0) * fxRate) * 100 -
          (b.fare.refundFee === 0 ? 0 : Math.round(20 * fxRate) * 100),
      ),
    );
  } else {
    weights = people.map(() => 1);
    const share =
      b.product === "hotel"
        ? b.quote.refundable &&
          !!b.quote.freeCancelUntil &&
          b.quote.freeCancelUntil >= today
          ? 1
          : 0
        : (() => {
            const days = (Date.parse(b.startDate) - Date.parse(today)) / 864e5;
            return days > 60 ? 0.9 : days > 30 ? 0.6 : days > 14 ? 0.3 : 0;
          })();
    // Bags, seats, package add-ons and service fees remain non-refundable under this simulated policy.
    eligible = allocate(
      Math.max(
        0,
        Math.floor(
          (b.pricing.base + b.pricing.taxes - b.pricing.discount) * 100 * share,
        ),
      ),
      weights,
    );
  }
  const gross = allocate(total, weights);
  const net = eligible.map((v, i) =>
    b.payment.status === "pending" || b.startDate < today
      ? 0
      : Math.min(v, gross[i]),
  );
  const gbp = allocate(accountingMinor, [
    ...net,
    Math.max(0, total - net.reduce((a, v) => a + v, 0)),
  ]);
  return people.map((p, i) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    grossMinor: gross[i],
    netMinor: net[i],
    gbpMinor: gbp[i],
  }));
}
