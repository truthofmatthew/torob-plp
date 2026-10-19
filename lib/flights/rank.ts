import { minuteOfDay } from "./jalali";
import type { FlightFare, FlightGroup, Party } from "./types";

/**
 * Ranks merged flights by the user's intent.
 *
 * Pure and deterministic: same flights + intent in, same order out. It only
 * reads FlightGroup/FlightFare, so a source change never touches this file.
 *
 * Rules, in order:
 * 1. Hard filters. A fare is usable only if it is bookable, has at least
 *    `adults + children` seats (infants sit on a lap) and, when the user asked
 *    for it, at least `minBaggageKg` (unknown baggage passes: not a "no"). A flight with no usable
 *    fare is hidden, and the count of hidden flights is returned so the UI can say so.
 * 2. The intent picks the order and, inside each card, the featured fare:
 *    - best («بهترین انتخاب», default): highest SCORE (below).
 *    - cheapest: lowest party total.
 *    - fastest: shortest flight, then price.
 *    - refundable: only flights with a fare whose early-cancellation penalty is
 *      ≤ REFUNDABLE_MAX_PENALTY; cheapest such fare first.
 *    - morning / evening: only departures inside WINDOWS, then by SCORE.
 * 3. SCORE (per fare, 0..1) = Σ WEIGHTS × term:
 *    - price    = cheapest party total in the results / this fare's total
 *    - refund   = (100 − early penalty) / 100
 *    - baggage  = min(kg, 30) / 30
 *    - duration = shortest flight / this flight
 *    - time     = 1 inside the preset's window, else TIME_OUTSIDE (best: 05–23,
 *                 i.e. only red-eye departures lose points)
 *    Unknown refund or baggage gets the neutral 0.5, never a bonus.
 * 4. «بهترین انتخاب» may cost at most PRICE_CEILING × the cheapest fare.
 *    Ties go to a system ticket over a charter (it follows the airline's
 *    published rules), then the lower price, then the earlier departure.
 * 5. A sponsored fare is never featured or recommended. It can still be listed.
 */
export const WEIGHTS = { price: 0.5, refund: 0.2, baggage: 0.1, duration: 0.1, time: 0.1 } as const;
export const PRICE_CEILING = 1.25; // «بهترین انتخاب» ≤ 25% above the cheapest
export const REFUNDABLE_MAX_PENALTY = 60; // «قابل استرداد» = early penalty ≤ 60%
const NEUTRAL = 0.5;
const TIME_OUTSIDE = 0.5;
const BAGGAGE_CAP_KG = 30;

export type Intent = "best" | "cheapest" | "fastest" | "refundable" | "morning" | "evening";

/** Departure windows in minutes since midnight, Tehran time. */
export const WINDOWS: Record<Intent, [number, number]> = {
  best: [5 * 60, 23 * 60],
  cheapest: [0, 24 * 60],
  fastest: [0, 24 * 60],
  refundable: [0, 24 * 60],
  morning: [5 * 60, 10 * 60],
  evening: [17 * 60, 24 * 60],
};

export const INTENTS: { id: Intent; label: string }[] = [
  { id: "best", label: "بهترین انتخاب" },
  { id: "cheapest", label: "ارزان‌ترین" },
  { id: "fastest", label: "سریع‌ترین" },
  { id: "refundable", label: "قابل استرداد" },
  { id: "morning", label: "صبح زود" },
  { id: "evening", label: "عصر و شب" },
];

export type RankedFlight = {
  group: FlightGroup;
  /** Usable fares for this party, cheapest first. */
  fares: FlightFare[];
  /** Lowest usable fare: the card's main price. */
  lowest: FlightFare;
  /** The fare this intent features on the card. Never sponsored. */
  featured: FlightFare | null;
  /** SCORE of `featured` (0..1), for the explanation. */
  score: number;
};

export type RankContext = {
  cheapestTotal: number;
  shortestMin: number;
  /** The cheapest usable fare in the results, for comparisons in the explanation. */
  cheapest: { group: FlightGroup; fare: FlightFare } | null;
};

export type RankResult = {
  flights: RankedFlight[];
  /** The list-level pick shown as «بهترین انتخاب ترب» (best intent only). */
  best: RankedFlight | null;
  context: RankContext;
  hidden: { noSeats: number; unavailable: number; outsideIntent: number };
};

export const seatsNeeded = (p: Party) => p.adults + p.children;

const isRefundable = (f: FlightFare) => f.refund.firstPenalty !== null && f.refund.firstPenalty <= REFUNDABLE_MAX_PENALTY;
export const inWindow = (g: FlightGroup, i: Intent) => {
  const m = minuteOfDay(g.departure);
  const [a, b] = WINDOWS[i];
  return m >= a && m < b;
};

export function scoreFare(f: FlightFare, g: FlightGroup, ctx: RankContext, intent: Intent): number {
  const price = f.total > 0 ? ctx.cheapestTotal / f.total : 0;
  const refund = f.refund.firstPenalty === null ? NEUTRAL : (100 - f.refund.firstPenalty) / 100;
  const baggage = f.baggageKg === null ? NEUTRAL : Math.min(f.baggageKg, BAGGAGE_CAP_KG) / BAGGAGE_CAP_KG;
  const duration = g.durationMin > 0 ? ctx.shortestMin / g.durationMin : NEUTRAL;
  const time = inWindow(g, intent === "morning" || intent === "evening" ? intent : "best") ? 1 : TIME_OUTSIDE;
  return (
    WEIGHTS.price * price +
    WEIGHTS.refund * refund +
    WEIGHTS.baggage * baggage +
    WEIGHTS.duration * duration +
    WEIGHTS.time * time
  );
}

const typeRank = (f: FlightFare) => (f.ticketType === "system" ? 0 : 1);

export function rankFlights(
  groups: FlightGroup[],
  party: Party,
  intent: Intent,
  opts: { minBaggageKg?: number } = {},
): RankResult {
  const need = seatsNeeded(party);
  const minBag = opts.minBaggageKg ?? 0;
  const hidden = { noSeats: 0, unavailable: 0, outsideIntent: 0 };

  // 1. Hard filters.
  const candidates: { group: FlightGroup; fares: FlightFare[] }[] = [];
  for (const g of groups) {
    const bookable = g.fares.filter((f) => f.bookable);
    if (!bookable.length) {
      hidden.unavailable++;
      continue;
    }
    const seated = bookable.filter((f) => f.seatsLeft === null || f.seatsLeft >= need);
    if (!seated.length) {
      hidden.noSeats++;
      continue;
    }
    const fares = seated.filter((f) => f.baggageKg === null || f.baggageKg >= minBag).sort((a, b) => a.total - b.total);
    if (!fares.length) {
      hidden.outsideIntent++;
      continue;
    }
    candidates.push({ group: g, fares });
  }

  const allFares = candidates.flatMap((c) => c.fares.map((fare) => ({ group: c.group, fare })));
  const nonSponsored = allFares.filter((x) => !x.fare.sponsored);
  const cheapest = [...(nonSponsored.length ? nonSponsored : allFares)].sort((a, b) => a.fare.total - b.fare.total)[0] ?? null;
  const context: RankContext = {
    cheapestTotal: cheapest?.fare.total ?? 0,
    shortestMin: Math.min(...candidates.map((c) => c.group.durationMin).filter((m) => m > 0), Infinity) || 0,
    cheapest,
  };

  // 2–4. Featured fare per card, then order.
  const byScore = (g: FlightGroup) => (a: FlightFare, b: FlightFare) =>
    scoreFare(b, g, context, intent) - scoreFare(a, g, context, intent) || typeRank(a) - typeRank(b) || a.total - b.total;

  let flights: RankedFlight[] = [];
  for (const { group, fares } of candidates) {
    if ((intent === "morning" || intent === "evening") && !inWindow(group, intent)) {
      hidden.outsideIntent++;
      continue;
    }
    const pickable = fares.filter((f) => !f.sponsored);
    let featured: FlightFare | null;
    if (intent === "refundable") {
      featured = pickable.find(isRefundable) ?? null;
      if (!featured) {
        hidden.outsideIntent++;
        continue;
      }
    } else if (intent === "cheapest" || intent === "fastest") {
      featured = pickable[0] ?? null;
    } else {
      const capped = pickable.filter((f) => f.total <= context.cheapestTotal * PRICE_CEILING);
      featured = [...(capped.length ? capped : pickable)].sort(byScore(group))[0] ?? null;
    }
    flights.push({
      group,
      fares,
      lowest: fares[0],
      featured,
      score: featured ? scoreFare(featured, group, context, intent) : 0,
    });
  }

  const dep = (a: RankedFlight, b: RankedFlight) => a.group.departure.localeCompare(b.group.departure);
  const total = (r: RankedFlight) => (r.featured ?? r.lowest).total;
  const sorters: Record<Intent, (a: RankedFlight, b: RankedFlight) => number> = {
    best: (a, b) => b.score - a.score || total(a) - total(b) || dep(a, b),
    morning: (a, b) => b.score - a.score || total(a) - total(b) || dep(a, b),
    evening: (a, b) => b.score - a.score || total(a) - total(b) || dep(a, b),
    cheapest: (a, b) => a.lowest.total - b.lowest.total || dep(a, b),
    fastest: (a, b) => a.group.durationMin - b.group.durationMin || a.lowest.total - b.lowest.total || dep(a, b),
    refundable: (a, b) => total(a) - total(b) || dep(a, b),
  };
  flights = flights.sort(sorters[intent]);

  const top = flights[0];
  const best =
    intent === "best" && top?.featured && top.featured.total <= context.cheapestTotal * PRICE_CEILING ? top : null;

  return { flights, best, context, hidden };
}
