# Flight source schema (as observed)

Captured 2026-10-19 from the public web app of one Iranian OTA (alibaba.ir) for THR→MHD,
THR→KIH and THR→SYZ on 2026-10-22 (۳۰ مهر ۱۴۰۵). Read-only, no login, no cookies, with the
app's descriptive User-Agent. Run `node --env-file=.env.local scripts/capture-flights.mjs <yyyy-mm-dd>`
to capture again. Full raw dumps go to `scripts/raw/` (git-ignored). The fallback sample
`data/flights-sample.json` keeps only the fields below. Mapping: `lib/flights/normalize.ts`.

## Search: `FLIGHTS_SEARCH_URL` (two steps)

1. `POST {FLIGHTS_SEARCH_URL}` with JSON
   `{origin, destination, departureDate: "2026-10-22", adult, child, infant}`
   → `{ result: { requestId, bannerId }, success, error }`
2. `GET {FLIGHTS_SEARCH_URL}/{requestId}` → `{ result: { isCompleted, departing[], returning[], packages[] , … } }`.
   It was complete on the first GET in every capture. The client polls at most 4 times
   (≥1 s apart) and doesn't cache a partial answer.

### `result.departing[i]`: one row per supplier × fare class

| Field | Example | Mapping |
|---|---|---|
| `origin`, `destination` | `THR`, `MHD` | airport codes, merge key |
| `originName`, `destinationName` | «تهران», «مشهد» | city names |
| `airlineCode`, `airlineName`, `airlineLogo` | `NA`, «نسیم ایر», CDN png | airline (logo falls back to the code) |
| `flightNumber` | `4600`, but also `0026` **and** `026` for the same flight | merge key, leading zeros dropped |
| `aircraft` | `Boeing 737`, ` Airbus A320` (leading space), `141` | trimmed, shown as-is |
| `leaveDateTime`, `arrivalDateTime` | `2026-10-22T06:50:00` (Tehran local, no zone) | times, duration, merge key |
| `classType`, `classTypeName` | `E` «اکونومی», `B` «بیزینس» | cabin, merge key |
| `class` | `B`, `Y`, `WB`, `SF` | fare class (shown on the flight page) |
| `ticketType` | `Charter`, `Systemic`, `null` | charter / system, else `isCharter`, else unknown |
| `priceAdult`, `priceChild`, `priceInfant` | `76125000` (**Rial**) | ÷10 → Toman. Missing child price → adult price (upper bound) |
| `maxAllowedBaggage` | `20` (15/20/25/30 seen) | baggage kg |
| `seat` | `0`–`10` | seats left (looks capped at 10) |
| `status` | `"4"` (= seats), `"X"` «کنسل شده», `"C"` «تکمیل ظرفیت» | X/C → not bookable |
| `isAllowedToBuy` | `true` | `false` → not bookable |
| `crcn` | `{"از زمان صدور بلیط تا 12:00 ظهر 3 روز قبل از پرواز": "60%", …}` | **refund table**, in order. The first row is the early-cancellation penalty |
| `rawCrcn[]` | `{fromMinutes, toMinutes, value, type: "Percent"}` | same table, machine form (unused: `crcn` keeps the seller's wording) |
| `isRefundable` | `true` on **all 120 rows** captured | **ignored**, carries no information |
| `promoted`, `discount` | `0` everywhere | `promoted > 0` → sponsored (never recommended) |
| `displayText` | «نرخ رسمی ایرلاین» on system fares | shown verbatim on the flight page |
| `flightId` | `FD:THR:MHD:261022:0650:R::900069:4600:E:B:750000:3` | field 8 = charter supplier id (`900069`). Names aren't published, so suppliers are numbered per flight |
| `uniqueKey` | `THRMHD20261022RNA4600BE900069375000` | fare id (dedupe) |
| `hasConnection` | `false` everywhere | stops |
| `terminal` | `"1"` or «فرودگاه مهرآباد - ترمینال 2» | → «ترمینال ۲» |
| `proposalId`, `otherPackagesForFlight`, `appliedRules`, `promotionDetails`, `commission`, `tourB2C*`, `b2B*`, `vip*`, … | | unused |

Refund tables seen: system fares mostly `30/60/80` or `10/…`; charters range from
`40/50/80/95/100` to `90/100` (you'd get 10% back). So the **first penalty**, not the flag,
is what tells "refundable" apart.

## Calendar: `FLIGHTS_CALENDAR_URL`

`POST` `{referenceDate: "2026-10-19T00:00:00.000Z", forwardDay: 7, backwardDay: 0, origin, destination}`
(the body the site's own date strip sends) →
`{ result: [{ adultPrice (Rial), childPrice, infantPrice, departureDateTime, arrivalTime, capacity, airline, systemKey, isCompleted }] }`,
one row per day, the cheapest flight that day. An empty or unknown query returns one row
with `departureDateTime: "0001-01-01T00:00:00"` and zero prices, which the normalizer drops.

## Seller link: `FLIGHTS_SELLER_URL`

The source has no per-offer URL that works outside its session. Each «خرید» row links to
the seller's own results page for the same search:
`{FLIGHTS_SELLER_URL}{FROM}-{TO}?adult=&child=&infant=&departing=<Jalali yyyy-mm-dd>`.

## Access notes
- `robots.txt` of the site: `User-agent: * ` with no `Disallow` (2026-10-19).
- No login, captcha or token on these two endpoints. The general-terms page didn't render
  any clause about automated access (checked 2026-10-19).
- Usage stays small: ≥1 s between calls, 5-min cache, one search = 2 calls (POST + GET),
  a card → flight page reuses the cached search.
- Considered and not used: Flytoday (`Disallow: /api/`), MrBilit (`Disallow:` on search URLs
  with dates), Snapptrip and Flightio (no stable public search call found in the time box).
