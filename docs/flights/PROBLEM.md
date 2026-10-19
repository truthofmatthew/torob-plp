# «ترب بلیت»: the problem

## The user
Sara books for her family: two adults and a 9-year-old, Tehran → Mashhad, next Thursday.
Plans can change, so she wants **the cheapest ticket she can cancel without losing most of
it**, and they travel with luggage.

## What she has to do today
Iranian flight search is split across OTAs and charter sellers. Even inside one OTA, the
same physical flight is listed several times: once per charter supplier and fare class,
each with its own price, seats and cancellation table. On the source this prototype uses,
one Thursday THR→MHD search returned **69 rows for 31 flights**. One Jet Sky flight had
**6 fares with a 49% price spread**, and on 6 flights the fares disagreed on the refund
penalty (for example 90% on the cheapest seat, 30% on one 5% dearer).

The site hides the duplicates by default and sorts by its own «پیشنهاد», so the cheaper or
more refundable seat on the same plane is one toggle away and easy to miss. The
`isRefundable` flag says *true* on every row, and the real rule lives in a table behind
«قوانین استرداد» on each row. She ends up opening rows one by one, doing the
"price × 3 people" math in her head and comparing penalties from memory.

## What she needs instead
1. **One card per flight** («در N پیشنهاد»), with the lowest price as the headline, like
   Torob's «در N فروشگاه».
2. Her intent as a single tap: ارزان‌ترین / سریع‌ترین / قابل استرداد / صبح زود / عصر,
   with «بهترین انتخاب» as a transparent default.
3. Party-aware prices and filters: totals for 3 people, and flights with fewer than 3
   seats hidden (with a note saying so).
4. **Why** a fare is suggested, in one line made of facts:
   «۵٪ گران‌تر از ارزان‌ترین پیشنهاد همین پرواز، ولی جریمه‌ی استرداد ۳۰٪ (به‌جای ۹۰٪) و ۲۰ کیلو بار».
5. Then a link to buy from the seller. Torob doesn't sell tickets.

## Before / after (one screen, in words)
**Before:** a list of 49 rows (69 with duplicates shown), each «نسیم ایر · چارتری ·
۷٬۶۱۲٬۵۰۰ · ۴ صندلی». Refund rules sit behind a link per row, the price is per adult, and
the same 06:50 flight appears twice at different prices.

**After:** «تهران ← مشهد · پنجشنبه ۳۰ مهر · ۲ بزرگسال، ۱ کودک». Chips: ✓بهترین انتخاب /
ارزان‌ترین / سریع‌ترین / قابل استرداد / صبح زود / عصر و شب. A 7-day price strip shows that
Saturday is cheapest. The first card reads «★ بهترین انتخاب ترب: ارزان‌ترین گزینه برای این
تعداد مسافر، جریمه‌ی استرداد ۳۰٪، ۲۰ کیلو بار و بلیت سیستمی», then 05:40 → 07:10,
«۷٬۶۳۴٬۰۰۰ تومان هر نفر · ۳ نفر: ۲۰٬۲۵۸٬۰۰۰». Lower cards show «در ۶ پیشنهاد» and, where
it matters, the dearer-but-refundable seat on the same plane with its reason. A note at the
bottom says what was hidden and why.
