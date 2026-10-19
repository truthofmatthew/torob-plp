# Decisions

## Scope
- **Recreated:** the search results page (PLP) from Figma page «somehow better» (`206:854`):
  the 6-state `ProductCard` (`206:880`), the filter chips, the location row (with and without
  a location) and the 2-column grid, in light and dark.
- **Kept exactly as Torob has it today:** the top search header and the bottom navbar. Both
  were measured from torob.com mobile (DOM + computed styles, 2026-10-19) and copied 1:1 into
  `components/torob/`: same SVGs, sizes, colors and links. They don't use the redesign tokens
  and stay light in dark mode, because the brief is "don't change them in any way".
  The one difference is the font: Torob uses its licensed *IRANYekan*, which we can't
  ship, so they render in Vazirmatn like the rest of the page.
- **Cut:** OTP/auth, the product page, voice/image search (the header buttons are inert, as
  on a logged-out web view), analytics events (the names from the handoff are listed below
  but not wired), and distance to in-person stores (see Location).

## Data mapping (`lib/normalize.ts`)
- The main card price is the search `price`, the lowest across stores. The seller section
  shows **that seller's own price** (Figma rule: «قیمت اصلی = کمترین قیمت؛ قیمت بخش ضمانت
  = پیشنهاد همان فروشنده»).
- Store count is parsed from `shop_text` («در ۱۴ فروشگاه» → 14). «در یدک مای» means one seller,
  and the name is taken from the text, so single-seller cards have a name before details arrive.
- Unavailable = `price` 0, «ناموجود» in `price_text`, or `price_text_mode: disabled`.
- Seller data needs the details endpoint (one call per product). Cards render immediately
  from search, the seller section shows its skeleton, and details are fetched **only for
  cards in or near the viewport, at most 2 at a time**, so a 24-card page does not fire 24 calls.
- Duplicate `random_key`s on a page (ad + organic) are dropped. The first (the ad) is kept.
- When nothing is known about the sellers (upstream down and not in the sample), the
  seller section says «N فروشنده در ترب» rather than inventing a name.

## The featured-seller rule (`lib/recommend.ts`)
This is a pure, documented function over `SellerOffer[]`, with no Torob field names, so it
survives endpoint changes.

1. In-person chip on and a priced in-store seller exists → cheapest in-store seller (حضوری).
2. Only one usable online seller → that seller (فروشنده).
3. **Recommended** («خرید با ضمانت ترب»). Best score among sellers that are:
   - not an ad (and the product card isn't an ad slot either),
   - covered by Torob purchase protection (`guarantee_info.status = enabled`),
   - in stock with a reliable price,
   - at most **15 % above the lowest usable price**.

   `score = 0.7 × (lowest / price) + 0.3 × (shop_score / 5)`. A shop without a score gets the
   neutral 2.5/5, never a bonus. Ties go to the lower price, then the name.
4. Otherwise → the cheapest usable non-ad seller (ارزان‌ترین). It falls back to an ad only if
   every seller is an ad.

Wording rules kept: no ratings shown, no «اصل», and protection is always «ضمانت ترب»,
never authenticity. An ad never carries the recommended label.

## Caching and rate limiting (`lib/torob.ts`)
- All Torob calls are made server-side in `/api/search`, `/api/product` and `/api/city`. URLs
  come from env (`TOROB_SEARCH_URL`, `TOROB_DETAILS_URL`, `TOROB_CITY_REVERSE_URL`), plus
  optional `TOROB_SEARCH_HEADERS` (JSON). Nothing upstream reaches the client bundle.
- Each upstream URL is cached for 5 min in memory and on disk (`./.cache` locally,
  `/tmp/.cache` on Vercel). Identical concurrent requests share one upstream call. Responses
  also send `s-maxage=300` so Vercel's edge serves repeats.
- Outbound calls go through one queue with **≥1 s between requests**, a 10 s timeout and one retry on timeouts/5xx.
  On Vercel the limit is per function instance. With the edge cache and a demo's traffic
  this stays well under 1 req/s overall, but it is not a global guarantee.
- Descriptive User-Agent that points at the repo.
- **Fallback:** if the env is unset, upstream errors or it times out → your captured sample
  (`data/torob-plp-data.json`), picked by keyword overlap with the query, with a visible
  «داده‌ی نمونه» note. The page always renders.

## Search UX
- Debounce 300 ms. Each new query aborts the previous request (`AbortController` plus a request
  id guard). The last good results stay on screen (dimmed, with a thin progress line) while the
  next load runs. The skeleton grid appears only when there is nothing to show yet.
- Paging uses infinite scroll (sentinel 600 px ahead) plus a «بیشتر» button as the fallback.
- States: loading skeleton (the Figma بارگذاری card), results, empty («نتیجه‌ای پیدا نشد»), error
  with retry.
- The URL keeps `?q=` so a link opens the same search.
- Chips: «خرید حضوری» toggles Torob's real `shop_type=offline` filter and switches cards to the
  in-person seller. «مرتب‌سازی» uses Torob's own sort list from `filters2`. «فیلترها» offers
  «فقط موجودها» and the categories Torob returns.

## Location
- With no location the row shows the Figma «بدون موقعیت» variant («تعیین»). Tapping uses the
  browser's geolocation, rounds it to ~1 km, and resolves the city via Torob's reverse
  geocoder → «موقعیت دقیق شما: تبریز».
- In-person stores are shown with or without a location (Figma rule). Distance is shown only
  when Torob returns one. Passing the user's position into the details call isn't wired
  (the parameter isn't confirmed), so for now the in-person meta shows the store's city.

## Design tokens
- All colors, spacing and radii come from «ترب · توکن‌ها». Dark values come from the Dark frame.
  Three dark tokens weren't defined in Figma and are derived: `skeleton #2a2c30`,
  `badge-ad #3d3216` / text `#f2c661`, `state-pressed rgba(255,255,255,.06)`.
- Icons are the Figma `Icon/*` SVGs, unmodified. Gray ones get a CSS tint in dark mode.
- Product images load straight from `image.torob.com` (lazy) rather than through
  `next/image`, so third-party images aren't proxied through Vercel.

## Not wired (from the handoff)
Analytics events `plp_card_view`, `plp_card_click {state, position}`, `plp_seller_click
{seller_id, is_recommended}`, `plp_notify_me`. «خبرم کن» only changes its own text and saves nothing.

## Pages beyond the PLP (v2)
The brief grew from "the results page" to "recreate Torob's UI for whatever is needed".
Only the results card has a Figma design, so the other pages follow **Torob's current
structure and URLs**, drawn with the same tokens and the card's seller language. Torob's
header, bottom nav and inner-page title bar are copied unchanged (measured on torob.com).

- **Bottom nav** routes inside the prototype. As on torob.com, only the home tab turns red
  (`rgb(215,0,64)`) and only on `/`. Every other tab stays dark everywhere.
- **Home (`/`)**: Torob's logo and home search box (48px, gray icon), then trending searches
  (`search-trends`), the first 8 root categories, the first special-offers row, and recently
  viewed from this device. Torob's service tiles (gold, TorobPay, nearby) belong to other
  products and were left out. A one-line footer says this is a prototype, not official
  Torob. Torob-backed pages render per request, not at build time, because Vercel's build
  machine couldn't reliably reach Torob. The server's 5-min cache keeps upstream calls flat.
- **Product (`/p/[id]`)** follows Torob's order: gallery → title + actions → buy box →
  sellers → specs → price history → similar.
  - The buy box uses the **same featured-seller rule as the card**: the big number is the
    lowest price, and the button names the featured seller with its own price
    («خرید با ضمانت ترب» when eligible).
  - Sellers: online / in-person tabs with Torob's counts, a «دارای ضمانت ترب» filter and
    «ارزان‌ترین اول». Rows show Torob's own score text verbatim (we never compute one), the
    seller's listing title, delivery notes and «به‌روزرسانی قیمت». The featured seller's row
    is tinted.
  - Price history: two series (lowest, median) on one axis with a legend, end ticks, a
    crosshair tooltip with Jalali dates, and a table view. Colors were validated with the
    dataviz checker for CVD/contrast in light (`#c4223a` / `#2b6cd4`) and dark
    (`#e8495f` / `#4c8ff0`). Torob's "quiet stretch" points are expanded so flat periods stay flat.
  - Similar products: a horizontal rail of the redesigned card.
- **Categories**: Torob's list (icon, title, chevron, 56px rows). A category with children
  opens its child list, which has an «همه‌ی کالاهای …» row; a leaf opens `/browse/[id]`, the
  same PLP preset to that category.
- **Special offers**: Torob's titled rows as card rails. Banner-type rows (no products) are skipped.
- **ترب من**: Torob's needs OTP login, which is out of scope. Here likes (from the product
  page) and recently viewed (recorded on every product visit) are kept in localStorage, with
  every access guarded so private mode just shows the empty state.
- **Not built**: the product guide (wiki), Q&A, the TorobPay/installment flows, shop pages,
  price-drop alerts for real («خبرم کن» only toggles), and search-by-image/voice.

New env vars, all server-side: `TOROB_SIMILAR_URL`, `TOROB_PRICE_CHART_URL`,
`TOROB_CATEGORY_URL`, `TOROB_OFFERS_URL`, `TOROB_TRENDS_URL`. Each degrades gracefully when
unset: a section hides or the sample is shown.
- Functions run in `fra1` (Frankfurt), the closest Vercel region to Torob, which cuts upstream latency and timeouts.

## Card actions, back, images (v3)
- **Like + notify on every card**, as on torob.com: a heart and a bell as two 32px round
  buttons (44px hit area) in the image's top-right corner, away from the «آگهی» badge
  (top-left). They don't open the card. Both are saved on the device and listed in «ترب من»
  (tabs پسندیده‌ها / خبرم کن / بازدیدها). The product page's buttons and the unavailable
  card's «خبرم کن» use the same lists, so a card and its page always agree. No alert is
  actually sent in the prototype.
- **Back on the product page (and category results)**: the 44×44 back from the Figma
  results header («Back (44×44 tap target)»), placed right of Torob's search box. The search
  box itself is unchanged. Back goes to the previous in-app page, or home when the link was
  opened directly.
- **Images**: cards load Torob's resized `…_/0x280.webp` (the gallery `0x720`, trend chips
  `0x64`) instead of 1000px+ originals. Several cards rendered blank when a grid requested
  24 originals at once. If a thumbnail fails, the card tries the original once, then shows
  «بدون تصویر».

## Flights («ترب بلیت», v4)
A second vertical in the same app, using the same rules: env-only URLs, a ≥1 s queue,
the 5-min cache, a captured sample fallback, a pure ranking with named weights, ads never
recommended, and Torob's chrome unchanged. Its decisions live in `docs/flights/DECISIONS.md`.
`lib/saved.ts` now exposes a generic `useStoredList` that both verticals use.
