/**
 * Date helpers. Dates travel through the app as ISO strings:
 * `YYYY-MM-DD` for calendar days and `YYYY-MM-DDTHH:mm` for local (airport) times.
 */
import { addDays, format, isValid, parseISO } from "date-fns";

export { parseISO };

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Parses `YYYY-MM-DD` (or a longer ISO string) as a local date; undefined when invalid. */
export function parseDate(iso: string | undefined | null): Date | undefined {
  if (!iso) return undefined;
  const d = parseISO(iso.length > 10 ? iso : `${iso}T00:00:00`);
  return isValid(d) ? d : undefined;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  return toISODate(addDays(parseDate(iso)!, days));
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function dayDiff(from: string, to: string): number {
  const a = parseDate(from.slice(0, 10))!;
  return Math.round((parseDate(to.slice(0, 10))!.getTime() - a.getTime()) / 864e5);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(0, dayDiff(checkIn, checkOut));
}

export function formatDateMed(iso: string): string {
  const d = parseDate(iso);
  return d ? format(d, "d MMM yyyy") : iso;
}

export function formatDateTimeMed(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, "d MMM yyyy, HH:mm") : iso;
}

export function formatDayLong(iso: string): string {
  const d = parseDate(iso);
  return d ? format(d, "EEEE d MMMM yyyy") : iso;
}

export function formatDayShort(iso: string): string {
  const d = parseDate(iso);
  return d ? format(d, "EEE d MMM") : iso;
}

/** 405 → "6h 45m", 60 → "1h", 45 → "45m". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** "2026-10-16T07:25" → "07:25". */
export function formatTime(localIso: string): string {
  return localIso.split("T")[1].slice(0, 5);
}

export function localMinutesOfDay(localIso: string): number {
  const [h, m] = localIso.split("T")[1].split(":").map(Number);
  return 60 * h + m;
}

/** Offset of `timeZone` from UTC, in minutes, at the given UTC instant. */
function tzOffsetMinutes(timeZone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const p: Record<string, number> = {};
  for (const part of parts) if (part.type !== "literal") p[part.type] = parseInt(part.value, 10);
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - 1000 * Math.floor(utcMs / 1000)) / 6e4);
}

/** Local wall-clock time in `timeZone` → UTC epoch ms. */
export function localToUtcMs(localIso: string, timeZone: string): number {
  const [date, time] = localIso.split("T");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const first = tzOffsetMinutes(timeZone, guess);
  const offset = tzOffsetMinutes(timeZone, guess - 6e4 * first);
  return guess - 6e4 * offset;
}

/** UTC epoch ms → local wall-clock `YYYY-MM-DDTHH:mm` in `timeZone`. */
export function utcMsToLocal(utcMs: number, timeZone: string): string {
  const d = new Date(utcMs + 6e4 * tzOffsetMinutes(timeZone, utcMs));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
