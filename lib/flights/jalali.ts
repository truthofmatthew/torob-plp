// Jalali dates via Intl (no date library). URLs carry Jalali "1405-08-01";
// the upstream wants Gregorian "2026-10-23". All dates are Tehran calendar days.

const TZ = "Asia/Tehran";
const DAY = 864e5;

const partsFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** A Gregorian yyyy-mm-dd as a Date at noon UTC (safe from DST/zone edges). */
const atNoon = (g: string) => new Date(`${g}T12:00:00Z`);
const gOf = (d: Date) => d.toISOString().slice(0, 10);

/** Gregorian yyyy-mm-dd → Jalali yyyy-mm-dd. */
export function toJalali(g: string): string {
  const p = Object.fromEntries(partsFmt.formatToParts(atNoon(g)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

/** Today in Tehran, Gregorian yyyy-mm-dd. */
export function todayG(): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}

export const addDaysG = (g: string, n: number) => gOf(new Date(atNoon(g).getTime() + n * DAY));

const JALALI_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Jalali yyyy-mm-dd → Gregorian yyyy-mm-dd, or null when invalid. Estimates the
 * day from the year/month, then walks to the exact match (at most a few steps).
 */
export function fromJalali(j: string): string | null {
  const m = JALALI_RE.exec(j);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  // 1 Farvardin ≈ 21 March; months 1–6 have 31 days, 7–11 have 30.
  const dayOfYear = (mo <= 6 ? (mo - 1) * 31 : 186 + (mo - 7) * 30) + d - 1;
  let guess = addDaysG(`${y + 621}-03-21`, dayOfYear);
  for (let i = 0; i < 4; i++) {
    const got = toJalali(guess);
    if (got === j) return guess;
    const diff = jalaliOrdinal(j) - jalaliOrdinal(got);
    if (!diff) break;
    guess = addDaysG(guess, diff);
  }
  return toJalali(guess) === j ? guess : null;
}

function jalaliOrdinal(j: string): number {
  const [y, mo, d] = j.split("-").map(Number);
  return y * 372 + (mo - 1) * 31 + d;
}

const longFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const shortFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: TZ, day: "numeric", month: "short" });
const weekdayFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: TZ, weekday: "short" });

/** «پنجشنبه ۳۰ مهر» */
export function jalaliLong(j: string): string {
  const g = fromJalali(j);
  return g ? longFmt.format(atNoon(g)) : j;
}
/** «۳۰ مهر» */
export function jalaliShort(j: string): string {
  const g = fromJalali(j);
  return g ? shortFmt.format(atNoon(g)) : j;
}
/** «پ» style weekday, for the calendar strip. */
export function jalaliWeekday(j: string): string {
  const g = fromJalali(j);
  return g ? weekdayFmt.format(atNoon(g)) : "";
}

/** "2026-10-22T06:50:00" (Tehran local) → "۰۶:۵۰". */
export function clock(iso: string): string {
  const t = iso.slice(11, 16);
  return t.replace(/[0-9]/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[Number(c)]);
}

/** Minutes since midnight of a Tehran-local ISO time. */
export const minuteOfDay = (iso: string) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
