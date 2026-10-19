// Captures real flight responses for the offline fallback (data/flights-sample.json)
// and full raw dumps for SCHEMA.md (scripts/raw/, git-ignored).
//
//   node --env-file=.env.local scripts/capture-flights.mjs 2026-10-22
//
// Read-only, ≥1 s between calls, same User-Agent as the app.
import { mkdir, writeFile } from "node:fs/promises";

const UA = "TorobFlights-Prototype/0.1 (hiring-challenge demo; read-only; +https://github.com/truthofmatthew/torob-plp)";
const SEARCH = process.env.FLIGHTS_SEARCH_URL;
const CALENDAR = process.env.FLIGHTS_CALENDAR_URL;
if (!SEARCH || !CALENDAR) throw new Error("FLIGHTS_SEARCH_URL / FLIGHTS_CALENDAR_URL not set");

const date = process.argv[2] ?? new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
const ROUTES = [
  ["THR", "MHD"],
  ["THR", "KIH"],
  ["THR", "SYZ"],
];
// Fields lib/flights/normalize.ts reads; the sample keeps only these (the raw dump keeps all).
const KEEP = ["origin", "destination", "originName", "destinationName", "airlineCode", "airlineName", "airlineLogo",
  "flightNumber", "aircraft", "leaveDateTime", "arrivalDateTime", "terminal", "class", "classType", "ticketType",
  "isCharter", "priceAdult", "priceChild", "priceInfant", "maxAllowedBaggage", "seat", "status", "isAllowedToBuy",
  "crcn", "promoted", "displayText", "uniqueKey", "flightId", "hasConnection"];
const pick = (r) => Object.fromEntries(KEEP.filter((k) => k in r).map((k) => [k, r[k]]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const headers = { Accept: "application/json", "Content-Type": "application/json", "User-Agent": UA };

async function post(url, body) {
  await sleep(1100);
  const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}
async function get(url) {
  await sleep(1100);
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}

const out = { capturedAt: new Date().toISOString(), date, search: {}, calendar: {} };
await mkdir("scripts/raw", { recursive: true });

for (const [origin, destination] of ROUTES) {
  const key = `${origin}-${destination}`;
  const created = await post(SEARCH, { origin, destination, departureDate: date, adult: 1, child: 0, infant: 0 });
  const id = created?.result?.requestId;
  let res;
  for (let i = 0; i < 6; i++) {
    res = await get(`${SEARCH}/${id}`);
    if (res?.result?.isCompleted) break;
  }
  await writeFile(`scripts/raw/flights-${key}.json`, JSON.stringify(res, null, 2));
  out.search[key] = { departing: (res?.result?.departing ?? []).map(pick) };

  const cal = await post(CALENDAR, {
    referenceDate: new Date(Date.parse(date) - 3 * 864e5).toISOString(),
    forwardDay: 7,
    backwardDay: 0,
    origin,
    destination,
  });
  await writeFile(`scripts/raw/calendar-${key}.json`, JSON.stringify(cal, null, 2));
  out.calendar[key] = cal?.result ?? [];
  console.log(key, out.search[key].departing.length, "offers,", out.calendar[key].length, "calendar days");
}

await writeFile("data/flights-sample.json", JSON.stringify(out));
console.log("wrote data/flights-sample.json");
