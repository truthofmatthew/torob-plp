# «ترب بلیت»: decisions

Second vertical in the prototype, built on the same pipeline: crawl offers → normalize
messy data → rank by intent → explain the choice → ship. Problem and user:
`PROBLEM.md`. Real fields: `SCHEMA.md`.

## Source
- **One live source: alibaba.ir's public web search** (two calls: POST to start, GET for
  results), plus its date-strip call for the price calendar. Picked because it's the only
  candidate whose robots.txt allows everything and whose search works without login,
  captcha or session. Flytoday disallows `/api/`, MrBilit disallows dated search URLs, and
  Snapptrip/Flightio had no stable call within the time box. The details and access notes
  are in `SCHEMA.md`.
- **Why one source still shows the merge:** that one source lists the same physical flight
  once per charter supplier and fare class (69 rows → 31 flights on THR→MHD). Those rows
  differ in price (up to 49% on one flight), seats and refund table. So «در N پیشنهاد» is
  real data, not a mock. Supplier names aren't published, so they show as «چارترکننده‌ی ۱/۲».
  The UI says «پیشنهاد», never «فروشگاه/فروشنده‌ی دیگر».
- Adding OTAs is adapter work: one more `fetch*` in `lib/flights/client.ts` and one
  normalizer producing the same `FlightFare`. The merge key (route + date + airline +
  number + departure + cabin) is OTA-independent, so cross-OTA cards would just get more
  fares. That's the first "next step" in `DEMO.md`.
- URLs live only in env: `FLIGHTS_SEARCH_URL`, `FLIGHTS_CALENDAR_URL`, `FLIGHTS_SELLER_URL`,
  optional `FLIGHTS_SEARCH_HEADERS`. The same queue as Torob (≥1 s between calls, 10 s
  timeout, one retry, in-flight dedupe). Only *completed* searches are cached (5 min, key =
  route + date + party).
- **Fallback:** env unset / error / timeout → `data/flights-sample.json` (real captures for
  THR→MHD, THR→KIH, THR→SYZ on ۳۰ مهر). The note names the captured date, so a sample is
  never passed off as the date the user picked. Other routes → an honest empty state that
  lists the sampled routes.
- Flight pages render per request (`force-dynamic`). Results are fetched by the client,
  so nothing upstream runs at build time (Vercel's US builders can't reliably reach Iran).

## Normalizing (`lib/flights/normalize.ts`)
- **Merge key:** origin, destination, date, airline, flight number (leading zeros dropped:
  the source sends `0026` and `026` for the same Caspian flight), departure time, cabin.
  Economy and business of the same flight stay separate cards, because nobody compares
  them as "the same product".
- Prices arrive in **Rial**, shown in Toman. Party total = adult × adults + child × children
  + infant × infants. A missing child price uses the adult price (an upper bound, never an
  invented discount).
- **Refund tier from the penalty table, not the flag.** `isRefundable` is `true` on all 120
  rows captured. The first row of `crcn` (cancel early) decides:
  ≤30% «استرداد با جریمه‌ی کم», 31–60% «استرداد با جریمه», >60% «استرداد با جریمه‌ی بالا»,
  no table → «قوانین استرداد نامشخص». The full table is shown verbatim on the flight page.
- Bookable = not cancelled (`X`), not full (`C`), seats > 0, price > 0, `isAllowedToBuy`.
  Cancelled/full flights are hidden from results and counted in the note.
- Terminals arrive as `"1"` or «فرودگاه مهرآباد - ترمینال 2» → «ترمینال ۲».

## Ranking (`lib/flights/rank.ts`)
A pure function with named constants. The rule list is in its doc comment.
- **Hard filters:** seats ≥ adults + children (infants sit on a lap); optional minimum
  baggage from the sentence («بار زیاد» → ≥20 kg, the usual allowance; drops the 15 kg
  fares). Unknown baggage passes, because "not stated" isn't "no".
- **Intents:** بهترین انتخاب (default), ارزان‌ترین, سریع‌ترین, قابل استرداد (early penalty
  ≤ `REFUNDABLE_MAX_PENALTY` = 60%; low-penalty cards first, then price), صبح زود
  (05:00–10:00), عصر و شب (17:00–24:00).
- **«بهترین انتخاب» score** per fare, 0..1: `WEIGHTS = { price: 0.5, refund: 0.2, baggage: 0.1, duration: 0.1, time: 0.1 }`.
  - price = cheapest party total ÷ this total. It dominates, because this is still a price-comparison product.
  - refund = (100 − early penalty) ÷ 100. Second, because it's the hidden cost that the source buries.
  - baggage = min(kg, 30) ÷ 30. Duration = shortest ÷ this. Both small, since domestic flights barely differ.
  - time = 1 inside 05:00–23:00, else 0.5, so only red-eyes lose points.
  - Unknown refund/baggage → neutral 0.5, never a bonus (same rule as the PLP's shop score).
  - `PRICE_CEILING` = 1.25: the best pick never costs more than 25% over the cheapest.
  - Ties: system over charter (the airline's own published rules), then price, then earlier.
- **Sponsored is never featured or best.** The source had no promoted rows (`promoted = 0`),
  so the rule is wired but not visible in the demo.
- Ranking runs **in the browser** on the merged list, so switching chips is instant and
  costs no upstream call. The API route returns merged, unranked flights. The flight page
  runs the same function on the server so its featured fare matches the card.

## Explaining (`lib/flights/explain.ts`)
- One line, generated only from fields: price difference (% and Toman for the party),
  early penalty (with «به‌جای ۹۰٪» when the comparison is worse), baggage (with «به‌جای»),
  system ticket, and the departure hour when the cheaper option is a red-eye.
- Two scopes. The list's «بهترین انتخاب ترب» is compared with the cheapest fare in the
  results. A card's featured fare is compared with **the cheapest fare of the same flight**,
  and the line only appears when they differ, so cards don't repeat the same sentence.
- Wording rules carried over from the PLP: the main price is always the lowest, the featured
  fare shows its own price and reason, no invented ratings, and a penalty is stated as the
  seller's table («جریمه‌ی استرداد ۳۰٪»), never as «تضمین» or a promise. The flight page
  footer says so.

## Natural-language query (`lib/flights/parse.ts`)
- «مشهد پنجشنبه صبح، ۳ نفر، بار زیاد» → to MHD, next Thursday, 3 adults, morning, ≥20 kg.
  Rule-based and pure, so it runs while typing with no key and no network. Every recognised
  part becomes a chip under the box and fills the form below, so a wrong guess is visible
  and fixable. Unrecognised text leaves the form alone.
- The same parser runs behind Torob's unchanged header on flight pages: a sentence
  re-searches flights, and text with no flight words goes to product search.
- An LLM parser (Claude, server-side, key in env, falling back to these rules) is a
  drop-in. It's not wired yet, pending the decision on a paid key.

## UX
- Routes: `/flights` (search), `/flights/search?from=THR&to=MHD&date=1405-07-30&adults=2&children=1[&intent=…&bag=20]`,
  `/flights/[id]` (`THR-MHD-2026-10-22-IR3496-0540-Y`). Intent and baggage live in the URL.
- Torob's header and bottom nav are unchanged. `/flights` uses Torob's title bar, and results
  and the flight page use the search header with the 44×44 back. Entry from home is one
  «ترب بلیت» tile under the search box. There's no fifth nav tab.
- **Card anatomy** (no Figma for flights; PLP anatomy and type scale): body (airline 14 →
  times 17 → badges 11 → lowest price 17 + party total 12 + «در N پیشنهاد») → seller section
  (reason 11 bold, featured price 13, seller · supplier 13, why-line 12).
- **Price strip:** the chosen date ±3 days from one call, as text (weekday, date, «۷٫۳ م»), with the
  cheapest day labelled «ارزان‌ترین» in words, not just color. It's deliberately not a bar
  chart: a price per day reads fine as text, and no new color encoding was introduced, so
  the dataviz palette wasn't needed.
- States: skeleton cards; «نتیجه‌ای پیدا نشد» with a one-tap reset when filters emptied
  the list; error with «تلاش دوباره»; the sample note; «پنهان شده: …» counts for hidden flights.
- Accessibility: 44px targets, chips use aria-pressed **and** a ✓ (not color alone),
  refund badges carry the % in text, cards have one full-card link plus an aria-label
  summary, calendar days have full-date labels.
- On-device lists reuse `lib/saved.ts` (now a generic `useStoredList`): recent searches
  (8) and «خبرم کن» watched flights (50, a price snapshot, refreshed when reopened). No
  alert is actually sent.

## Cut
- Round trips, multi-city and international. Cabin filter (business shows as its own card).
- Cross-OTA merge (see Source), seller ratings (none exist we could use honestly), and
  booking or payment: the row links to the seller.
- An LLM parser (pending key decision), real price alerts, and analytics.
- Airline logos come straight from the source's CDN (lazy, falling back to the IATA code).
