import { cityOf } from "./airports";
import { toJalali } from "./jalali";
import type { CalendarDay, Cabin, FlightFare, FlightGroup, Party, RefundKind, RefundPolicy, TicketType } from "./types";
import { faDigits } from "../format";

// Upstream flight JSON → FlightGroup[]. The only file that knows the source's
// field names (see docs/flights/SCHEMA.md). Defensive throughout: a missing or
// odd field degrades one badge, never the page.

type Raw = Record<string, unknown>;

/** The OTA every live offer is bought from. */
export const SELLER_NAME = "علی‌بابا";

const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const rialToToman = (v: unknown) => Math.round(num(v) / 10);

/** "0026" and "026" are the same flight (seen side by side in one response). */
const flightNo = (v: unknown) => str(v).trim().replace(/^0+(?=\d)/, "");

function ticketTypeOf(r: Raw): TicketType {
  const t = str(r.ticketType).toLowerCase();
  if (t === "charter") return "charter";
  if (t === "systemic" || t === "system") return "system";
  return r.isCharter === true ? "charter" : "unknown";
}

const cabinOf = (r: Raw): Cabin => (str(r.classType) === "B" ? "business" : "economy");

/** "1" / "فرودگاه مهرآباد - ترمینال 2" → "ترمینال ۲". */
function terminalOf(v: unknown): string {
  const m = /(\d+)\s*$/.exec(str(v));
  return m ? `ترمینال ${faDigits(m[1])}` : "";
}

export function refundTier(firstPenalty: number | null): RefundKind {
  if (firstPenalty === null) return "unknown";
  if (firstPenalty <= 30) return "low";
  if (firstPenalty <= 60) return "partial";
  return "none";
}

/**
 * The seller's cancellation table (`crcn`: label → "60%"), in the seller's
 * order, earliest cancellation first. The upstream `isRefundable` is true on
 * every offer seen, so it is not used.
 */
function refundOf(r: Raw): RefundPolicy {
  const table = r.crcn && typeof r.crcn === "object" ? (r.crcn as Record<string, unknown>) : {};
  const rows = Object.entries(table)
    .map(([label, v]) => ({ label: faDigits(label.replace(/\s+/g, " ").trim()), penalty: parseInt(str(v), 10) }))
    .filter((x) => Number.isFinite(x.penalty));
  const firstPenalty = rows.length ? rows[0].penalty : null;
  return { kind: refundTier(firstPenalty), firstPenalty, rows };
}

const minutesBetween = (a: string, b: string) => Math.round((Date.parse(`${b}Z`) - Date.parse(`${a}Z`)) / 60000);

type Ctx = { party: Party; sellerUrl: string };

function fareOf(r: Raw, ctx: Ctx, supplierLabel: string): FlightFare {
  const adult = rialToToman(r.priceAdult);
  // Missing child price → charge the adult price (an upper bound, never a made-up discount).
  const child = rialToToman(r.priceChild) || adult;
  const infant = rialToToman(r.priceInfant);
  const { adults, children, infants } = ctx.party;
  const status = str(r.status);
  const seats = Number.isFinite(Number(r.seat)) ? num(r.seat) : null;
  return {
    id: str(r.uniqueKey) || str(r.proposalId).slice(0, 40),
    sellerName: SELLER_NAME,
    supplierLabel,
    ticketType: ticketTypeOf(r),
    fareClass: str(r.class),
    price: { adult, child, infant },
    total: adult * adults + child * children + infant * infants,
    baggageKg: num(r.maxAllowedBaggage) > 0 ? num(r.maxAllowedBaggage) : null,
    seatsLeft: seats,
    refund: refundOf(r),
    sponsored: num(r.promoted) > 0,
    note: str(r.displayText),
    sellerUrl: ctx.sellerUrl,
    bookable: r.isAllowedToBuy !== false && status !== "X" && status !== "C" && (seats ?? 1) > 0 && adult > 0,
  };
}

/** The seller's own results page for this search. It has no per-offer link. */
export function sellerSearchUrl(base: string, from: string, to: string, gDate: string, party: Party): string {
  if (!base) return "";
  const q = new URLSearchParams({
    adult: String(party.adults),
    child: String(party.children),
    infant: String(party.infants),
    departing: toJalali(gDate),
  });
  return `${base.replace(/\/?$/, "/")}${from}-${to}?${q}`;
}

/** Stable, URL-safe id for one physical flight: route, date, airline+number, time, cabin. */
export const groupId = (from: string, to: string, departure: string, airline: string, number: string, cabin: Cabin) =>
  `${from}-${to}-${departure.slice(0, 10)}-${airline}${number}-${departure.slice(11, 13)}${departure.slice(14, 16)}-${cabin === "business" ? "C" : "Y"}`;

/**
 * Raw search body → merged flights. The same physical flight arrives once per
 * supplier and fare class (68 rows → 31 flights on THR→MHD); each becomes
 * a fare inside one group, like Torob's «در N فروشگاه».
 */
export function normalizeFlights(body: unknown, ctx: Ctx): { groups: FlightGroup[]; offerCount: number } {
  const result = (body as Raw | null)?.result as Raw | undefined;
  const rows = Array.isArray(result?.departing) ? (result!.departing as Raw[]) : [];
  const byId = new Map<string, { rows: Raw[] }>();

  for (const r of rows) {
    const from = str(r.origin);
    const to = str(r.destination);
    const dep = str(r.leaveDateTime);
    const airline = str(r.airlineCode);
    if (!from || !to || !dep || !airline) continue;
    const id = groupId(from, to, dep, airline, flightNo(r.flightNumber), cabinOf(r));
    const g = byId.get(id) ?? { rows: [] };
    g.rows.push(r);
    byId.set(id, g);
  }

  const groups: FlightGroup[] = [];
  for (const [id, { rows: rs }] of byId) {
    const first = rs[0];
    // Charter suppliers have numeric ids in `flightId` (field 8); the source
    // doesn't publish their names, so they're numbered within the flight.
    const supplierIds: string[] = [];
    const fares = rs.map((r) => {
      const type = ticketTypeOf(r);
      const sup = str(r.flightId).split(":")[7] ?? "";
      let label: string;
      if (type === "system") label = `فروش سیستمی ایرلاین · کلاس ${str(r.class)}`;
      else {
        const key = sup || str(r.uniqueKey);
        if (!supplierIds.includes(key)) supplierIds.push(key);
        label = `چارترکننده‌ی ${faDigits(supplierIds.indexOf(key) + 1)}`;
      }
      return fareOf(r, ctx, label);
    });

    // Upstream repeats identical rows; keep one per id.
    const seen = new Set<string>();
    const unique = fares.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
    unique.sort((a, b) => Number(b.bookable) - Number(a.bookable) || a.price.adult - b.price.adult);

    const dep = str(first.leaveDateTime);
    const arr = str(first.arrivalDateTime);
    const anyBookable = unique.some((f) => f.bookable);
    const cancelled = rs.every((r) => str(r.status) === "X");
    const from = str(first.origin);
    const to = str(first.destination);
    groups.push({
      id,
      airline: { code: str(first.airlineCode), name: str(first.airlineName) || str(first.airlineCode), logo: str(first.airlineLogo) || null },
      flightNumber: flightNo(first.flightNumber),
      aircraft: str(first.aircraft).trim(),
      origin: { code: from, city: str(first.originName) || cityOf(from) },
      destination: { code: to, city: str(first.destinationName) || cityOf(to) },
      terminal: terminalOf(first.terminal),
      departure: dep,
      arrival: arr,
      durationMin: arr ? Math.max(minutesBetween(dep, arr), 0) : 0,
      stops: first.hasConnection === true ? 1 : 0,
      cabin: cabinOf(first),
      fares: unique,
      status: anyBookable ? "available" : cancelled ? "cancelled" : "full",
    });
  }

  groups.sort((a, b) => a.departure.localeCompare(b.departure));
  return { groups, offerCount: rows.length };
}

/** Raw calendar body → one cheapest price per Jalali day. */
export function normalizeCalendar(body: unknown): CalendarDay[] {
  const rows = Array.isArray((body as Raw | null)?.result) ? ((body as Raw).result as Raw[]) : [];
  const days = new Map<string, number | null>();
  for (const r of rows) {
    const dt = str(r.departureDateTime);
    if (!/^\d{4}-\d{2}-\d{2}/.test(dt) || dt.startsWith("0001")) continue;
    const j = toJalali(dt.slice(0, 10));
    const p = rialToToman(r.adultPrice) || null;
    const prev = days.get(j);
    days.set(j, prev == null ? p : p == null ? prev : Math.min(prev, p));
  }
  return [...days.entries()].map(([date, minPrice]) => ({ date, minPrice })).sort((a, b) => a.date.localeCompare(b.date));
}
