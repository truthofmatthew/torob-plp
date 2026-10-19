import { faDigits, faPrice } from "../format";
import { clock } from "./jalali";
import { inWindow, type RankContext, type RankedFlight } from "./rank";
import type { FlightFare, FlightGroup, RefundKind } from "./types";

// One Persian line saying why a fare is featured, built only from the fare's
// own fields and the ranking context. No adjectives the data can't back:
// «جریمه‌ی استرداد ۳۰٪» states the seller's table, it doesn't promise a refund.

export const REFUND_BADGE: Record<RefundKind, string> = {
  low: "استرداد با جریمه‌ی کم",
  partial: "استرداد با جریمه",
  none: "استرداد با جریمه‌ی بالا",
  unknown: "قوانین استرداد نامشخص",
};

const pct = (n: number) => `${faDigits(Math.round(n))}٪`;

export type Baseline = { fare: FlightFare; group: FlightGroup; scope: "results" | "flight" };

/**
 * «۱۲٪ گران‌تر از ارزان‌ترین، ولی جریمه‌ی استرداد ۳۰٪ (به‌جای ۹۰٪) و ۲۰ کیلو بار»
 * `baseline` is what the fare is compared with: the cheapest fare in the
 * results (the list's best pick) or the cheapest fare of the same flight (a card).
 */
export function explainFare(fare: FlightFare, group: FlightGroup, baseline: Baseline | null, partySize: number): string {
  const base = baseline?.fare;
  const what = baseline?.scope === "flight" ? "ارزان‌ترین پیشنهاد همین پرواز" : "ارزان‌ترین";
  const parts: string[] = [];

  let lead: string;
  if (!base || fare.total <= base.total) {
    lead = baseline?.scope === "flight" ? "ارزان‌ترین پیشنهاد این پرواز" : "ارزان‌ترین گزینه برای این تعداد مسافر";
  } else {
    const diff = fare.total - base.total;
    const over = (diff / base.total) * 100;
    lead =
      over < 1
        ? `${faPrice(diff)} تومان گران‌تر از ${what}`
        : `${pct(over)} گران‌تر از ${what}${partySize > 1 ? ` (${faPrice(diff)} تومان برای ${faDigits(partySize)} نفر)` : ""}`;
  }

  const p = fare.refund.firstPenalty;
  const bp = base?.refund.firstPenalty ?? null;
  if (p !== null) {
    parts.push(bp !== null && bp > p && base !== fare ? `جریمه‌ی استرداد ${pct(p)} (به‌جای ${pct(bp)})` : `جریمه‌ی استرداد ${pct(p)}`);
  }
  if (fare.baggageKg) {
    const bb = base?.baggageKg ?? null;
    parts.push(bb !== null && bb < fare.baggageKg && base !== fare ? `${faDigits(fare.baggageKg)} کیلو بار (به‌جای ${faDigits(bb)})` : `${faDigits(fare.baggageKg)} کیلو بار`);
  }
  if (fare.ticketType === "system") parts.push("بلیت سیستمی");
  // A red-eye cheapest flight is a real reason to pay more; say which hour.
  const bg = baseline?.group;
  if (bg && bg !== group && !inWindow(bg, "best") && inWindow(group, "best")) {
    parts.push(`ساعت ${clock(group.departure)} (ارزان‌ترین ساعت ${clock(bg.departure)} است)`);
  }

  if (!parts.length) return lead;
  const joiner = fare.total <= (base?.total ?? Infinity) ? "، " : "، ولی ";
  return lead + joiner + joinFa(parts);
}

/** Why a flight is the list's «بهترین انتخاب»: compared with the cheapest fare in the results. */
export function explainBest(best: RankedFlight, ctx: RankContext, partySize: number): string {
  const base = ctx.cheapest ? { ...ctx.cheapest, scope: "results" as const } : null;
  return explainFare(best.featured ?? best.lowest, best.group, base, partySize);
}

function joinFa(xs: string[]): string {
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join("، ")} و ${xs[xs.length - 1]}`;
}
