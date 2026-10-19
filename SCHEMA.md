# Torob response schema (as observed)

Captured 2026-10-19 with `q=لنت ترمز پراید`, `source=next_mobile`, read-only, no auth.
These are the fields this app actually reads. Everything else is ignored. The mapping lives
in `lib/normalize.ts`. Raw captures are written to `scripts/raw/` locally, which is git-ignored.

## Search: `TOROB_SEARCH_URL`

Query params sent: `q`, `page` (0-based), `size=24`, `sort`, `source=next_mobile`, plus
optional `shop_type=offline`, `available=true`, `category=<cat_id>`.

### Top level

| Field | Type | Used for |
|---|---|---|
| `results[]` | array (≈24–26 per page) | cards (see below) |
| `count` | number, capped at 1200 | total |
| `next` | string URL or null | `hasMore` |
| `filters2[]` | array | the `slug: "sort"` entry's `items[{name, value}]` becomes the sort sheet. Seen values: `""` (محبوب‌ترین), `price`, `-price`, `-date`, `-supply`. The `slug: "shop_type"` entry has `value: "offline"` for the in-person chip |
| `categories[]` | `{title, cat_id, cat_slug, …}` | category filter |
| `spellcheck`, `filters1`, `attributes`, `min_price`, `max_price`, `show_location_prompt`, `vlp_result`, `related_queries` | various | not used yet |

### `results[i]`

| Field | Example | Mapping |
|---|---|---|
| `random_key` | `cbef9150-…` | `Offer.id`, also the detail lookup key (prk) |
| `name1` | «لنت ترمز جلو وانت پراید امکو…» | title |
| `name2` | `mco-front-brake-pad-pride-van` | unused (latin slug or empty) |
| `image_url` | `https://image.torob.com/…webp` | image |
| `web_client_absolute_url` | `/p/<prk>/<slug>/` | link to the torob.com product page |
| `price` | `1521630` (Toman) | lowest price |
| `price_text` | «۱٫۵۲۱٫۶۳۰ تومان» | only checked for «ناموجود» |
| `price_text_mode` | `active` | `disabled` → unavailable |
| `price_prefix` | `cheapest` | unused |
| `shop_text` | «در ۱۴ فروشگاه» / «در یدک مای» | store count, or the single shop's name |
| `is_adv` | `true` | ad badge. The card can never be "recommended" |
| `discount_info[]` | `[]` | discount pill when it contains a `n%` |
| `stock_status` | `""` | unused (always empty in captures) |
| `media_urls[]`, `image_count`, `card_type`, `badges[]`, `is_authentic`, `has_nearby_shop`, `more_info_url`, `similar_api`, `media_search` | | unused. `is_authentic` is deliberately ignored: no authenticity claims |

Note: the same `random_key` can appear twice on one page (ad slot plus organic). It is deduplicated.

## Product details: `TOROB_DETAILS_URL`

Params: `prk=<random_key>`, `source=next_mobile`.

### `products_info.result[]` (online sellers)

| Field | Example | Mapping (`SellerOffer`) |
|---|---|---|
| `shop_name` | «لنتام» | `shopName` |
| `shop_name2` | «تهران» or «تهران، اورجین کالا» | `city` (text before «،») |
| `shop_id` | `45572` | `shopId` |
| `price` | `1326000` | `price` |
| `availability` | `true` | `available` |
| `is_price_unreliable` | `false` | `priceUnreliable` |
| `is_adv` | `true` | `isAd` (never recommended) |
| `guarantee_info.status` | `"enabled"` / `"disabled"` | `protectedPurchase` («خرید با ضمانت ترب») |
| `shop_score` | `5` (0 = none) | `shopScore` (null when 0) |
| `page_url` | `https://api.torob.com/v4/product-page/redirect/…` | seller link |
| `is_recommended` | `false` | not used. Our rule is our own and documented |
| `score_info`, `installment`, `more_info`, `last_price_change_date`, `badges` | | unused |

### `products_in_store_info.result[]` (in-person stores)

Same seller fields (`shop_name`, `shop_name2`, `price`, `is_price_unreliable`) plus
`distance` (empty until a location is set), `address`, `working_hours`, `is_open`.

`products_info.count` / `products_in_store_info.count` give the totals. `sellers_url` pages beyond the first list.

## City reverse geocode: `TOROB_CITY_REVERSE_URL`

`?lat=&lon=` → `{"id": 65, "name": "تبریز"}`. Used only for the location row label.

## Captured sample (`data/torob-plp-data.json`)

The fallback is your 2026-10-13 capture (Tabriz). It has `plp.{bearing,disc}[]` with the same item
fields as `results[]`, and `product_details[prk]` with `online[]` (uses `torob_guarantee:
"enabled"` instead of `guarantee_info`) and `instore[]`. `normalizeDetails` reads both shapes.

## Added for the other pages

| Env | Params | Shape used |
|---|---|---|
| `TOROB_SIMILAR_URL` | `prk`, `limit` | `{results[]}`, same item shape as search |
| `TOROB_PRICE_CHART_URL` | `prk`, `v=2` | `{lines, points[{date, lowest, median, stretch?:"quiet", until?}]}` |
| `TOROB_CATEGORY_URL` | `catid` (0 = root) | `{category{id,title,category_parent}, children[{id,title,icon,image,has_children,status}]}` |
| `TOROB_OFFERS_URL` | `page` | `{results[{type, data[{title,description,api_url(cat_ids=…)}], base_products[]}], next}` |
| `TOROB_TRENDS_URL` | none | `[{query, category_id, partial_info(search item)}]` |

Product details fields used by the product page: `media_urls[]`, `image_urls[{urls[]}]`,
`breadcrumbs[{title,cat_id}]`, `key_specs[{items[{key,value[]}]}]`,
`structural_specs.headers[{header,specs{}}]`, `min_price`, `max_price`, `availability`,
`products_info.count`, `products_in_store_info.count`. Per seller: `name1` (listing title),
`score_info.score_text`, `more_info.{payment_on_delivery,same_day_delivery}`,
`last_price_change_date`, `button_text`. Per store: `address`, `working_hours.title{status,text}`.
