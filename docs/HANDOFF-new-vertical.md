# Handoff prompt: build «ترب بلیت» (flight tickets) inside the Torob prototype

> Paste everything below the line into a new Claude Code session.

---

## Who I am and what this is for

I'm applying to Torob's **AI Product Engineer** hiring challenge (jobs.torob.com/challenge).
The brief says: «برای اپلای، ترب ... رو بساز: بلیت هواپیما، بیمه، خودرو، خانه، یا هر بازاری که
فکر می‌کنی جست‌وجوش می‌تونه خیلی بهتر بشه.» That means: build "Torob for X" for a market whose
search could be much better, and send a demo video of at most 5 minutes plus a project link.

They judge product sense end to end. Their own diagram is: **user problem → data → ranking → UX → shipped demo → learn/iterate**. The challenge page's terminal mock shows the expected pipeline:

```
build torob --for "airplane tickets"
> crawl offers
> normalize messy data
> rank by user intent
> explain the best choice
> ship demo.mp4 --max-duration 5m
```

They value full-stack engineering, product judgment, UX taste and hands-on use of AI.

**Task for this session:** build **«ترب بلیت»**, a flight-ticket search vertical, as new routes
inside the existing app below. It must follow that pipeline and be demoable on a phone in
under 5 minutes.

## What already exists (don't rebuild it, reuse it)

**Project:** `/Volumes/Datas/Torob/plp-app`. This is a Next.js 15 App Router + TypeScript app
with CSS Modules (no Tailwind), RTL, Persian numerals and Vazirmatn.

**Repo:** github.com/truthofmatthew/torob-plp (public). `main` auto-deploys to Vercel.

**Live:** https://torob-plp.vercel.app. The Vercel team is `truthofmatthews-projects` and functions are pinned to the `fra1` region.

It's a recreation of Torob's mobile shopping UI on **live Torob data**. It has these routes:
`/` home, `/search?query=` results, `/p/[id]` product, `/categories`, `/categories/[id]`,
`/browse/[id]`, `/special-offers`, `/me` («ترب من»: likes / alerts / history on the device).

Read these first; they're the source of truth:
- `README.md`: routes and folder layout.
- `DECISIONS.md`: every product, data and UX decision, with reasons. Keep the same style for the new vertical.
- `SCHEMA.md`: how the real upstream fields were documented. Do the same for the flight data source.

### Architecture to copy for the new vertical

| Layer | File | Pattern to follow |
|---|---|---|
| Upstream client | `lib/torob.ts` | **Server-only.** URLs come from env vars only (never hardcoded or committed). Descriptive User-Agent. **5-min cache** (memory + disk: `./.cache` locally, `/tmp/.cache` on Vercel). Global queue with **≥1 s between outbound calls**. 10 s timeout, **one retry** on timeout/5xx. In-flight dedupe. Reuse `getJson()` and add new names to `EndpointName`. |
| Types | `lib/types.ts` | UI types carry **no upstream field names**, so an API change only touches the normalizer. |
| Normalizer | `lib/normalize.ts` | Raw JSON → UI types. Defensive: a missing field degrades the UI, never crashes it. Dedupe ids (upstream repeats items). |
| Ranking | `lib/recommend.ts` | **A pure, documented function** with named weights (`WEIGHTS`, `PRICE_CEILING`) and an ordered rule list in its doc comment. Ads are never recommended. No invented ratings: unknown values get a neutral midpoint, never a bonus. |
| Fallback | `lib/sample.ts` + `data/*.json` | If env is unset, upstream fails or it times out → serve a **captured sample** and show a visible «داده‌ی نمونه» note. The demo must always render. |
| API routes | `app/api/*/route.ts` | Thin: validate params → client → normalize → rank → JSON with `Cache-Control: s-maxage=300`. |
| Pages | `app/*/page.tsx` | Torob-backed pages use `export const dynamic = "force-dynamic"` (see gotchas). |
| Shell | `components/Shell.tsx` | Torob's header (search or title bar) + Torob's bottom nav + a 480px column. |
| Lazy enrichment | `hooks/useFeaturedSellers.ts` | Fetches per-item details only for items in view, at most 2 at a time. |
| On-device lists | `lib/saved.ts` | `useSyncExternalStore` + guarded localStorage (likes / alerts / history). Reuse it for saved flights and price alerts. |
| Back | `lib/nav.ts` | `useGoBack()` goes back in-app, or home when the page was opened directly. |
| Formatting | `lib/format.ts` | `faDigits`, `faPrice` (Persian digits, `٬` group separator). Use `Intl.DateTimeFormat("fa-IR-u-ca-persian")` for **Jalali dates**. |
| Images | `lib/img.ts` | Torob CDN thumbnails (`…_/0x280.webp`). Only relevant for airline logos if they come from a CDN. |
| Charts | `components/product/PriceChart.tsx` | SVG, two series max, legend + tooltip + table view. Its palette was **validated with the `dataviz` skill**. Load that skill and run its validator before adding any chart (for example a price calendar). |

### Design system and rules (non-negotiable)

- **Tokens:** «ترب · توکن‌ها» from Figma `N5id7sK2gxFhy35CpHDWic`, node `206:854` (page «somehow better»).
  They're already in `app/globals.css` as `--color-*`, `--space-*`, `--radius-*`, with light and dark
  variants. Use the tokens, never raw hex, except inside the Torob chrome below.
- **Torob's chrome is never restyled:** `components/torob/TorobHeader`, `TorobBottomNav` and
  `TorobTitleBar` are 1:1 copies measured from torob.com. Torob asked for the *least change* to
  their current design. The only allowed addition is the 44×44 back button from the Figma header.
  **Don't add a fifth tab to the bottom nav.** Make the flight vertical reachable from the home page (a
  service tile or card, e.g. «ترب بلیت ✈») and from its own URL.
- The card language from the PLP carries over:
  - The main price is the lowest.
  - A featured option shows its own price and a reason label.
  - An ad or sponsored result is **never** labelled as Torob's recommendation.
  - No invented ratings.
  - Protection or refund wording is never worded as a quality guarantee.
- Every state needs designing: loading skeleton, empty («نتیجه‌ای پیدا نشد»), error with retry, and sample-data note.
- Accessibility: 44px tap targets, no state conveyed by color alone, screen-reader labels.
- Phone-first: check at 320 / 360 / 412 widths, in light and dark.

## What to build: «ترب بلیت»

### 1. Problem (write it down first, in `docs/flights/PROBLEM.md`)

Iranian flight search today is split across many OTAs (online travel agencies) and charter sellers. The same flight shows at different
prices and with different rules: charter vs system tickets, refundability, baggage allowance, and
whether the price includes everything. Users end up comparing tabs by hand.

Pick **one sharp user** and their intent. For example: "Tehran → Mashhad, next Thursday,
family of 3, wants the cheapest *refundable* option with luggage."

Sketch one before/after screen in words.

### 2. Data (crawl offers → normalize messy data)

- **Find a real, public, read-only source** for flight offers. Candidates to investigate are the public
  search endpoints that the web apps of Iranian aggregators call (e.g. Alibaba, Flytoday,
  Snapptrip, MrBilit, Flightio).
  - Use the browser pane, capture network calls, and pick the one with the cleanest public data.
  - **Read the site's terms and robots.txt first.** If the only route is behind login, captchas or clear prohibition, **don't bypass anything**. Use a captured sample dataset instead and say so in the demo.
  - Ask me before relying on any source whose terms look restrictive.
- Put the endpoint in **env only** (`FLIGHTS_SEARCH_URL`, plus `FLIGHTS_SEARCH_HEADERS` if needed).
  - Add the vars to `.env.local` (git-ignored) and to Vercel for production and preview: `vercel env add … --scope truthofmatthews-projects`.
  - Add empty keys to `.env.example`.
- Capture 2–3 real responses into `data/flights-sample.json` for the fallback. Pick routes the demo uses: THR/IKA→MHD, THR→KIH, THR→SYZ.
- Document the real fields in `docs/flights/SCHEMA.md` **from an actual response**. Don't assume field names.
- Normalize to a `FlightOffer` type, roughly:
  - airline (name + IATA), flight number, aircraft
  - origin/destination (IATA + Persian city name)
  - departure/arrival (ISO + Jalali display), duration
  - stops
  - cabin, fare class
  - **ticket type (charter / system)**
  - **refund policy** (refundable / partial / none + penalty if given)
  - **baggage kg**
  - seats left
  - price per adult / child / infant, **total for the party**, and whether taxes are included
  - seller/OTA name, deep link
  - sponsored flag
- **Dedupe** the same physical flight across sellers into one card with N sellers, like Torob's «در N فروشگاه». That merge is the core "Torob" move.

### 3. Rank by user intent (pure function, `lib/flights/rank.ts`)

- Intent presets as chips:
  - «ارزان‌ترین»
  - «سریع‌ترین»
  - «بهترین انتخاب» (default)
  - «قابل استرداد»
  - «صبح زود / عصر»
- «بهترین انتخاب» is a documented weighted score. Start with:
  - price vs cheapest
  - duration
  - refundability
  - baggage
  - departure-time fit with the chosen preset
  - system over charter only as a tie-breaker
- Hard filters from the query: party size, so seats-left must be at least the party size.
- Ads and sponsored results are never "best".
- Keep weights in named constants and explain them in `DECISIONS.md`.

### 4. Explain the best choice (the "AI" part, keep it honest)

- Each featured card shows **why** in one Persian line generated from the actual scores. For example:
  «۱۲٪ گران‌تر از ارزان‌ترین، ولی قابل استرداد و ۲۰ کیلو بار». No invented facts.
- Optional: a natural-language query box («مشهد پنجشنبه صبح، ۳ نفر، بار زیاد») parsed into
  structured filters.
  - If you use an LLM, call it **server-side** with the key in env. Load the `claude-api` skill first and use the latest Claude model.
  - The parser must fall back to plain chips when the key is missing.
  - Show the parsed filters as chips so the user can see and fix them.

### 5. UX (routes inside the same app)

- `/flights`: search form styled like Torob's home.
  - Origin/destination airport pickers with Persian names.
  - A Jalali date picker.
  - Passenger count.
  - Recent searches from `lib/saved.ts`.
- `/flights/search?from=THR&to=MHD&date=1405-08-01&adults=3`: results.
  - Header: Torob's search header with back, unchanged.
  - Intent chips.
  - A **price calendar strip**: the cheapest per day ±3 days, if the source gives it cheaply. Otherwise cut it.
  - Merged flight cards (time row, airline, duration, ticket type, refund and baggage badges, lowest price, «در N فروشنده»).
  - The featured option with its reason line.
- `/flights/[id]`: one flight. All sellers (price, refund rules, baggage), and a deep link to the seller per row.
- Card design: no Figma exists for flights.
  - Build it from the existing tokens, the type scale (Card/Title 14, Card/Price 17, Card/Seller 13, Caption 11–12) and the PLP card's anatomy (media → body → seller section).
  - Optionally design it in Figma first via the Figma MCP (load `figma:figma-use` first) in file `N5id7sK2gxFhy35CpHDWic`, then implement it with `figma:figma-design-to-code`.
- Home: add a «ترب بلیت» entry (a tile or card) linking to `/flights`. Don't touch Torob's header or nav.

### 6. Ship

- Work on a branch: `git switch -c feat/flights`. Commit in small steps, each body giving the reason. End messages with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push the branch to get a Vercel preview URL. Verify it, then merge to `main`, which deploys production.
- Docs to write:
  - `docs/flights/PROBLEM.md`, `SCHEMA.md`, `DECISIONS.md`: source, mapping, rank weights, what was cut.
  - A section in the root `README.md`.
- Demo script `docs/flights/DEMO.md` for a ≤5-min video:
  - problem (30s)
  - one search with intent switching (90s)
  - the explanation of the best choice (60s)
  - the dedupe/merge across sellers (45s)
  - data + ranking design (45s)
  - what I'd do next (30s)

## Gotchas already learned the hard way

1. **Vercel's build machine (US) can't reliably reach Iranian hosts.** Pages that fetch upstream must
   be `force-dynamic`, not prerendered, or a build-time timeout freezes the sample into the page.
   Functions run in `fra1` (set in `vercel.json`).
2. **CSS Modules purity:** selectors like `i[data-x]` fail. Every selector needs a local class.
3. **Upstreams repeat items** (ad + organic). Dedupe by id before rendering, or React key errors and duplicate cards follow.
4. **The browser pane's screenshots go stale after scroll/navigation, and lazy images don't load while
   the pane is hidden.** Verify with DOM checks (`javascript_tool`, `find`, `read_page`) and not only screenshots.
5. **Stale dev servers:** before `npm run dev -- -p 3217`, check `lsof -iTCP:3217`, and don't run `next build`
   while dev is running (it corrupts `.next`).
6. **Use `ctx_execute` for HTTP probing.** This environment redirects `curl` through context-mode.
7. Torob's own sort values and filters came from the API (`filters2`), not from guessing. Read the source's own filter/sort metadata the same way.
8. `vercel link` rewrites `.env.local` (it appends). Check the file afterwards, and never commit it.

## Constraints

- Large files (clones, videos, exports) go on `/Volumes/Datas/...`, never in `~/`. Check `df -h /` before creating anything large.
- No auth/OTP and no payments: the demo deep-links to the seller to buy.
- Flag any ambiguity with a recommended default instead of stalling. Ask me only for decisions that are mine:
  - which data source if the terms are unclear
  - whether to use a paid LLM key
