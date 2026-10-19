# Torob PLP: redesign prototype on live data

A phone-first, RTL recreation of Torob's search results page using the redesigned
`ProductCard` from Figma. Torob's own top search bar and bottom navbar are kept exactly
as they are on torob.com. The data is Torob's real public catalog, fetched server-side.

This is a hiring-challenge prototype, not an official Torob product.

- `SCHEMA.md`: the real response fields and how they map
- `DECISIONS.md`: the mapping, the featured-seller rule and its weights, caching and rate
  limiting, and what was cut

## Run locally

```bash
cp .env.example .env.local   # fill in the endpoints
npm install
npm run dev
```

Without the env vars (or when Torob is unreachable) the page serves the captured sample
in `data/torob-plp-data.json` and says so.

## Pages (Torob's own URL shapes)

| Route | Page |
|---|---|
| `/` | Home: logo, search box, trending searches, categories, a special-offers rail, recently viewed |
| `/search?query=` | Results (the redesigned PLP) |
| `/p/[id]` | Product: gallery, buy box, sellers (online / in-person), specs, price history, similar |
| `/categories`, `/categories/[id]` | Category tree |
| `/browse/[id]` | A category's products (same PLP, preset to the category) |
| `/special-offers` | «پیشنهاد ویژه» rows |
| `/me` | «ترب من»: likes and recently viewed, stored on this device (no login) |
| `/flights`, `/flights/search?from=&to=&date=&adults=`, `/flights/[id]` | «ترب بلیت»: flight search (see below) |

## Layout

```
app/api/search      GET ?q=&page=&sort=&inperson=1&available=1&category=
app/api/product     GET ?id=<prk>&ad=1&inperson=1  → sellers + featured seller
app/api/similar     GET ?id=<prk>                  → similar products
app/api/price-chart GET ?id=<prk>                  → price history points
app/api/city        GET ?lat=&lon=                 → city name
lib/torob.ts        server-only client: env URLs, 5-min cache, ≥1 s between calls
lib/normalize.ts    Torob JSON → Offer / SellerOffer / ProductPage
lib/recommend.ts    featured-seller rule (pure)
lib/catalog.ts      categories, special offers, trends
lib/saved.ts        likes + history (localStorage, guarded)
components/         ProductCard (6 states), ProductGrid, FilterBar, Sheet, SearchPage
components/product  product page sections
components/torob    Torob's unchanged header, bottom nav and title bar
```

## «ترب بلیت»: flights

A second vertical in the same app, reachable from the home tile or `/flights`. It's built
like the PLP: crawl offers → normalize → rank by intent → explain the pick.

- One card per physical flight, merged from all its offers («در N پیشنهاد»). The source
  lists the same plane once per charter supplier and fare class.
- Intent chips (بهترین انتخاب / ارزان‌ترین / سریع‌ترین / قابل استرداد / صبح زود / عصر و شب)
  re-rank instantly in the browser. Party size is a hard filter on seats.
- A one-line, field-based reason for every featured fare, and a ±3-day price strip.
- A one-sentence query («مشهد پنجشنبه صبح، ۳ نفر، بار زیاد») parsed into visible chips.

```
app/api/flights/search    GET ?from=&to=&date=<Jalali>&adults=&children=&infants=  → merged flights
app/api/flights/calendar  GET same params → cheapest fare per day, ±3 days
lib/flights/client.ts     server-only source client (POST + poll, cached via lib/torob.ts)
lib/flights/normalize.ts  source JSON → FlightGroup/FlightFare, merge, refund tiers
lib/flights/rank.ts       intents + «بهترین انتخاب» score (pure, named weights)
lib/flights/explain.ts    the reason line
lib/flights/parse.ts      sentence → filters
components/flights/       search form, results, card, flight page
scripts/capture-flights.mjs  refreshes data/flights-sample.json
```

Env (server-side only): `FLIGHTS_SEARCH_URL`, `FLIGHTS_CALENDAR_URL`, `FLIGHTS_SELLER_URL`,
optional `FLIGHTS_SEARCH_HEADERS`. Without them, the captured sample is served with a note.
Docs: `docs/flights/PROBLEM.md`, `SCHEMA.md`, `DECISIONS.md`, `DEMO.md`.
