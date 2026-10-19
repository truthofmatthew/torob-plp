import "server-only";
import { cached, endpoint, NotCacheable, requestJson, UpstreamUnavailable } from "../torob";
import { addDaysG, fromJalali } from "./jalali";
import type { Party } from "./types";

// Flight source client. The search is two steps upstream: POST the query to get
// a request id, then GET the results until `isCompleted`. Both go through
// lib/torob.ts's queue (≥1 s apart, 10 s timeout, one retry). Only completed
// results are cached (5 min, keyed by route + date + party), so a partial
// answer never sticks.

const MAX_POLLS = 4;

export type SearchParams = { from: string; to: string; gDate: string; party: Party };

export async function fetchFlights(p: SearchParams) {
  const key = `flights:search:${p.from}:${p.to}:${p.gDate}:${p.party.adults}:${p.party.children}:${p.party.infants}`;
  return cached(key, async () => {
    const url = endpoint("FLIGHTS_SEARCH_URL");
    const created = (await requestJson(url, {
      body: {
        origin: p.from,
        destination: p.to,
        departureDate: p.gDate,
        adult: p.party.adults,
        child: p.party.children,
        infant: p.party.infants,
      },
      headersEnv: "FLIGHTS_SEARCH_HEADERS",
    })) as { result?: { requestId?: string } } | null;
    const id = created?.result?.requestId;
    if (!id) throw new UpstreamUnavailable("no request id");

    type Results = { result?: { isCompleted?: boolean } } | null;
    let last: Results = null;
    for (let i = 0; i < MAX_POLLS; i++) {
      last = (await requestJson(new URL(`${url.toString().replace(/\/$/, "")}/${encodeURIComponent(id)}`), {
        headersEnv: "FLIGHTS_SEARCH_HEADERS",
      })) as Results;
      if (last?.result?.isCompleted) return last;
    }
    // Still running after MAX_POLLS: show what we have, don't cache it.
    if (last) throw new NotCacheable(last);
    throw new UpstreamUnavailable("search did not complete");
  });
}

/** Cheapest fare per day for `days` days starting `back` days before the date. */
export async function fetchCalendar(from: string, to: string, gDate: string, back = 3, days = 7) {
  const start = addDaysG(gDate, -back);
  const key = `flights:calendar:${from}:${to}:${start}:${days}`;
  return cached(key, () =>
    requestJson(endpoint("FLIGHTS_CALENDAR_URL"), {
      body: { referenceDate: `${start}T00:00:00.000Z`, forwardDay: days, backwardDay: 0, origin: from, destination: to },
      headersEnv: "FLIGHTS_SEARCH_HEADERS",
    }),
  );
}

export const sellerBase = () => process.env.FLIGHTS_SELLER_URL ?? "";

/** Validates the query string shared by the flight API routes and pages. */
export function parseQuery(sp: URLSearchParams): (SearchParams & { jDate: string }) | null {
  const from = (sp.get("from") ?? "").toUpperCase();
  const to = (sp.get("to") ?? "").toUpperCase();
  const jDate = sp.get("date") ?? "";
  const gDate = fromJalali(jDate);
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || from === to || !gDate) return null;
  const clamp = (v: string | null, min: number, max: number, def: number) =>
    Math.min(Math.max(Number.isFinite(Number(v)) && v !== null && v !== "" ? Math.floor(Number(v)) : def, min), max);
  const adults = clamp(sp.get("adults"), 1, 9, 1);
  const children = clamp(sp.get("children"), 0, 9 - adults, 0);
  const infants = clamp(sp.get("infants"), 0, adults, 0);
  return { from, to, gDate, jDate, party: { adults, children, infants } };
}
