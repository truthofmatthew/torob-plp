import { faDigits } from "../format";
import type { Intent } from "./rank";
import type { FlightQuery, Party, TicketType } from "./types";

/** 90 → «۱ ساعت و ۳۰ دقیقه», 60 → «۱ ساعت». */
export function durationFa(min: number): string {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${faDigits(m)} دقیقه`;
  return m ? `${faDigits(h)} ساعت و ${faDigits(m)} دقیقه` : `${faDigits(h)} ساعت`;
}

/** 7612500 → «۷٫۶ م» (millions of Toman, for the calendar strip). */
export function shortPrice(toman: number): string {
  return `${faDigits((toman / 1e6).toFixed(1)).replace(".", "٫")} م`;
}

/** «۲ بزرگسال، ۱ کودک» */
export function partyFa(p: Party): string {
  const parts = [`${faDigits(p.adults)} بزرگسال`];
  if (p.children) parts.push(`${faDigits(p.children)} کودک`);
  if (p.infants) parts.push(`${faDigits(p.infants)} نوزاد`);
  return parts.join("، ");
}

export const partySize = (p: Party) => p.adults + p.children + p.infants;

export const TICKET_FA: Record<TicketType, string> = { charter: "چارتری", system: "سیستمی", unknown: "نوع بلیت نامشخص" };

/** /flights/search?from=…&to=…&date=…&adults=…, plus optional intent/baggage. */
export function searchHref(q: FlightQuery, extra: { intent?: Intent; bag?: number } = {}): string {
  const sp = new URLSearchParams({ from: q.from, to: q.to, date: q.date, adults: String(q.party.adults) });
  if (q.party.children) sp.set("children", String(q.party.children));
  if (q.party.infants) sp.set("infants", String(q.party.infants));
  if (extra.intent && extra.intent !== "best") sp.set("intent", extra.intent);
  if (extra.bag) sp.set("bag", String(extra.bag));
  return `/flights/search?${sp}`;
}

/** Party as query string for links to a flight's page. */
export function partyQuery(p: Party): string {
  const sp = new URLSearchParams({ adults: String(p.adults) });
  if (p.children) sp.set("children", String(p.children));
  if (p.infants) sp.set("infants", String(p.infants));
  return sp.toString();
}
