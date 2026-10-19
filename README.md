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
