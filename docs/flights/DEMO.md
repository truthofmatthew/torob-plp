# Demo script: «ترب بلیت» (≤ 5 min)

Record on a phone (or 390px in a browser), light mode. Open the production URL beforehand
once so the 5-min cache is warm. Fallback: if live data fails, the sample note shows, and
the captured date is ۳۰ مهر, so search THR→MHD **for ۳۰ مهر** and the script still works.

| Time | Screen | Say |
|---|---|---|
| **0:00–0:30 · Problem** | alibaba.ir results for THR→MHD Thursday, «نمایش بلیت‌های تکراری» on | "Flight search in Iran: the same plane shows up several times, once per charter supplier, at different prices and with different refund rules. This Thursday it's 69 rows for 31 flights. The 'refundable' flag is true on every single one, and the real penalty is behind a link. A family of three ends up comparing rows by hand." |
| **0:30–2:00 · One search, switching intent** | Torob home → «ترب بلیت» tile → type «مشهد پنجشنبه صبح، ۳ نفر، بار زیاد» | "I keep Torob's UI and add one tile. I type what I want in a sentence. It's parsed live into chips: Mashhad, Thursday, 3 travellers, morning, ≥20 kg. If it's wrong I can see it and fix it in the form." |
| | Results: chips «صبح زود» ✓ and «بار ≥ ۲۰ کیلو» | "One card per flight. The headline is the lowest price per person, then the total for three. At the bottom it says what it hid: full flights, and flights outside my morning window." |
| | Remove the baggage chip, tap «ارزان‌ترین», «سریع‌ترین», «قابل استرداد» | "Intent is one tap and instant: ranking runs on the device over the merged list, so no new request is made. 'Refundable' means the penalty table says ≤60%, with the low-penalty ones first." |
| | Price strip: tap Saturday («ارزان‌ترین») | "The strip shows the cheapest price for ±3 days from one call. Saturday is cheaper, so I tap it." |
| **2:00–3:00 · Explaining the choice** | Back to «بهترین انتخاب»: top card «★ بهترین انتخاب ترب · چرا؟ …» | "The default is a transparent score: price first, then refund penalty, then baggage, duration and red-eye hours. The 'why' line is generated only from fields. Here: cheapest for three, 30% penalty, 20 kg, a system ticket." |
| | Scroll to a card with «۵٪ گران‌تر از ارزان‌ترین پیشنهاد همین پرواز، ولی جریمه‌ی استرداد ۳۰٪ (به‌جای ۹۰٪)» | "This is the case Sara cares about. Same plane, two offers. The cheapest seat loses 90% if she cancels. For 5% more, she loses 30%. We feature that one and say exactly why, with no invented ratings. Ads would never get this slot." |
| **3:00–3:45 · Merge across sellers** | Tap that card → flight page | "Every offer of this flight side by side: price per person and for three, ticket type, fare class, baggage, seats, and the seller's own penalty table, verbatim. Each row links to the seller to buy. «خبرم کن» keeps the flight on this device." |
| **3:45–4:30 · Data & ranking design** | DECISIONS.md / SCHEMA.md (or a slide) | "Server-side client: URLs only in env, ≥1 s between calls, 5-minute cache, only complete answers cached, and a real captured sample when the source is down, labelled with its date. The normalizer is the only file that knows the source's field names: Rial to Toman, flight numbers with and without leading zeros, refund tier from the table instead of the flag. Ranking is one pure function with named weights." |
| **4:30–5:00 · Next** | Results page | "Next: a second and third OTA through the same adapter, so cards become truly cross-seller. Then an LLM parser behind the same chips, real price-drop alerts, and round trips." |

## Checklist before recording
- `/flights/search?from=THR&to=MHD&date=<next Thursday>&adults=2&children=1` loads live (no sample note).
- At least one card shows a «به‌جای ۹۰٪» line. If not that day, try THR→SYZ or use the
  ۳۰ مهر sample (unset `FLIGHTS_SEARCH_URL` locally).
- Reset recent searches (`/flights` → «پاک کردن») for a clean first screen.
