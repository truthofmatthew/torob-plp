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

/** «۱۲٪ گران‌تر از ارزان‌ترین، ولی جریمه‌ی استرداد ۳۰٪ (به‌جای ۹۰٪) و ۲۰ کیلو بار» */
export function explainFare(fare: FlightFare, group: FlightGroup, ctx: RankContext, partySize: number): string {
  const cheapest = ctx.cheapest?.fare;
  const cheapestGroup = ctx.cheapest?.group;
  const parts: string[] = [];

  let lead: string;
  if (!cheapest || fare.total <= cheapest.total) {
    lead = "ارزان‌ترین گزینه برای این تعداد مسافر";
  } else {
    const diff = fare.total - cheapest.total;
    const over = (diff / cheapest.total) * 100;
    lead =
      over < 1
        ? `${faPrice(diff)} تومان گران‌تر از ارزان‌ترین`
        : `${pct(over)} گران‌تر از ارزان‌ترین${partySize > 1 ? ` (${faPrice(diff)} تومان برای ${faDigits(partySize)} نفر)` : ""}`;
  }

  const p = fare.refund.firstPenalty;
  const cp = cheapest?.refund.firstPenalty ?? null;
  if (p !== null) {
    parts.push(cp !== null && cp > p && cheapest !== fare ? `جریمه‌ی استرداد ${pct(p)} (به‌جای ${pct(cp)})` : `جریمه‌ی استرداد ${pct(p)}`);
  }
  if (fare.baggageKg) parts.push(`${faDigits(fare.baggageKg)} کیلو بار`);
  if (fare.ticketType === "system") parts.push("بلیت سیستمی");
  // A red-eye cheapest flight is a real reason to pay more; say which hour.
  if (cheapestGroup && cheapestGroup !== group && !inWindow(cheapestGroup, "best") && inWindow(group, "best")) {
    parts.push(`ساعت ${clock(group.departure)} (ارزان‌ترین ساعت ${clock(cheapestGroup.departure)} است)`);
  }

  if (!parts.length) return lead;
  const joiner = lead.startsWith("ارزان‌ترین") ? "، " : "، ولی ";
  return lead + joiner + joinFa(parts);
}

/** Why a flight is the list's «بهترین انتخاب»: its fare line plus timing facts. */
export function explainBest(best: RankedFlight, ctx: RankContext, partySize: number): string {
  return explainFare(best.featured ?? best.lowest, best.group, ctx, partySize);
}

function joinFa(xs: string[]): string {
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join("، ")} و ${xs[xs.length - 1]}`;
}
