"use client";

import { useEffect } from "react";
import { faDigits, faPrice } from "@/lib/format";
import { explainFare, REFUND_BADGE } from "@/lib/flights/explain";
import { durationFa, partyFa, partySize, TICKET_FA } from "@/lib/flights/format";
import { clock, jalaliLong } from "@/lib/flights/jalali";
import type { Intent, RankedFlight } from "@/lib/flights/rank";
import { seatsNeeded } from "@/lib/flights/rank";
import { useSavedFlights } from "@/lib/flights/saved";
import type { FlightFare, FlightGroup, FlightQuery } from "@/lib/flights/types";
import { AirlineLogo, FareBadges } from "./FlightCard";
import s from "./flights.module.css";

export default function FlightDetail({
  group: g,
  ranked,
  query,
  intent,
}: {
  group: FlightGroup;
  ranked: RankedFlight | null;
  query: FlightQuery;
  intent: Intent;
}) {
  const saved = useSavedFlights();
  const size = partySize(query.party);
  const need = seatsNeeded(query.party);
  const featured = ranked?.featured ?? null;
  const lowest = ranked?.lowest ?? g.fares[0];
  const watching = saved.has(g.id);
  const title = `${g.airline.name} ${faDigits(g.flightNumber)} · ${g.origin.city} ← ${g.destination.city}`;

  // Keep a watched flight's snapshot fresh when its page is opened again.
  useEffect(() => {
    if (watching && lowest) {
      const prev = saved.list.find((x) => x.id === g.id);
      if (prev && prev.minPrice !== lowest.price.adult) saved.add({ ...prev, minPrice: lowest.price.adult });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, []);

  // Featured first, then the rest cheapest first; unusable fares last.
  const order = [...g.fares].sort((a, b) => {
    const rank = (f: FlightFare) => (f === featured ? 0 : usable(f) ? 1 : 2);
    return rank(a) - rank(b) || a.total - b.total;
  });
  function usable(f: FlightFare) {
    return f.bookable && (f.seatsLeft === null || f.seatsLeft >= need);
  }

  return (
    <>
      <section className={s.detailHead} aria-labelledby="flight-h">
        <div className={s.airline}>
          <AirlineLogo code={g.airline.code} src={g.airline.logo} />
          <h1 id="flight-h" className={s.airlineName}>
            {g.airline.name} {faDigits(g.flightNumber)}
          </h1>
          <span className={s.flightNo}>{g.aircraft}</span>
        </div>
        <div className={`${s.times} ${s.detailTimes}`}>
          <span className={s.time}>
            <span className={s.timeValue}>{clock(g.departure)}</span>
            <span className={s.timeCity}>
              {g.origin.city} {g.terminal && `· ${g.terminal}`}
            </span>
          </span>
          <span className={s.duration}>
            <span>{durationFa(g.durationMin)}</span>
            <span className={s.durationLine} aria-hidden />
            <span>{g.stops ? `${faDigits(g.stops)} توقف` : "بدون توقف"}</span>
          </span>
          <span className={s.time}>
            <span className={s.timeValue}>{clock(g.arrival)}</span>
            <span className={s.timeCity}>{g.destination.city}</span>
          </span>
        </div>
        <p className={s.detailMeta}>
          <span>{jalaliLong(query.date)}</span>
          <span>{partyFa(query.party)}</span>
          <span>{g.cabin === "business" ? "بیزینس" : "اکونومی"}</span>
          <span>
            {faDigits(g.fares.length)} پیشنهاد، از {faPrice(lowest.price.adult)} تومان هر نفر
          </span>
        </p>
        <div className={s.detailActions}>
          <button
            type="button"
            className={s.actionBtn}
            aria-pressed={watching}
            onClick={() =>
              watching
                ? saved.remove(g.id)
                : saved.add({
                    id: g.id,
                    title,
                    date: query.date,
                    departure: g.departure,
                    minPrice: lowest.price.adult,
                    query,
                    at: Date.now(),
                  })
            }
          >
            <img src="/icons/bell.svg" width={16} height={16} alt="" aria-hidden />
            {watching ? "زیر نظر است" : "خبرم کن"}
          </button>
        </div>
      </section>

      <h2 className={s.faresTitle}>
        همه‌ی پیشنهادهای این پرواز
      </h2>
      <ol className={s.fares}>
        {order.map((f) => (
          <li key={f.id} className={s.fare} data-featured={f === featured ? "" : undefined}>
            <div className={s.fareHead}>
              <div>
                {f === featured && (
                  <p className={s.reason}>
                    {f === lowest && intent !== "refundable" ? "ارزان‌ترین پیشنهاد" : intent === "refundable" ? "ارزان‌ترین پیشنهاد قابل استرداد" : "پیشنهاد ترب برای این پرواز"}
                  </p>
                )}
                <p className={s.sellerName}>
                  {f.sellerName} · {f.supplierLabel}
                </p>
                {f.sponsored && <span className={s.adBadge}>آگهی</span>}
              </div>
              <div className={s.fareRight}>
                <p className={s.priceRow}>
                  <span className={s.amount}>{faPrice(f.price.adult)}</span>
                  <span className={s.unit}>تومان / نفر</span>
                </p>
                {size > 1 && (
                  <p className={s.caption}>
                    {faDigits(size)} نفر: {faPrice(f.total)}
                  </p>
                )}
              </div>
            </div>

            <div className={s.fareBadges}>
              <FareBadges fare={f} cabin={g.cabin} />
            </div>
            {f === featured && f !== lowest && (
              <p className={`${s.sellerWhy} ${s.fareWhy}`}>{explainFare(f, g, { fare: lowest, group: g, scope: "flight" }, size)}</p>
            )}

            <dl className={s.fareFacts}>
              <div>
                <dt>نوع بلیت</dt>
                <dd>{TICKET_FA[f.ticketType]}</dd>
              </div>
              <div>
                <dt>کلاس نرخی</dt>
                <dd className={s.ltr}>
                  {f.fareClass || "—"}
                </dd>
              </div>
              <div>
                <dt>بار مجاز</dt>
                <dd>{f.baggageKg ? `${faDigits(f.baggageKg)} کیلو` : "اعلام نشده"}</dd>
              </div>
              <div>
                <dt>صندلی باقی‌مانده</dt>
                <dd>{f.seatsLeft !== null ? faDigits(f.seatsLeft) : "اعلام نشده"}</dd>
              </div>
              {query.party.children > 0 && (
                <div>
                  <dt>کودک</dt>
                  <dd>{faPrice(f.price.child)} تومان</dd>
                </div>
              )}
              {query.party.infants > 0 && (
                <div>
                  <dt>نوزاد</dt>
                  <dd>{f.price.infant ? `${faPrice(f.price.infant)} تومان` : "اعلام نشده"}</dd>
                </div>
              )}
            </dl>

            <details className={s.rules}>
              <summary>
                {REFUND_BADGE[f.refund.kind]}
                {f.refund.rows.length ? " · جدول جریمه‌ی استرداد" : ""}
              </summary>
              {f.refund.rows.length ? (
                <table className={s.rulesTable}>
                  <tbody>
                    {f.refund.rows.map((r) => (
                      <tr key={r.label}>
                        <td>{r.label}</td>
                        <td>{faDigits(r.penalty)}٪</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className={s.caption}>فروشنده جدول جریمه را اعلام نکرده است.</p>
              )}
            </details>

            {f.note && <p className={s.caption}>{f.note}</p>}

            {usable(f) ? (
              <a className={s.buy} href={f.sellerUrl || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!f.sellerUrl}>
                خرید از {f.sellerName} ↗
              </a>
            ) : (
              <p className={`${s.caption} ${s.fareFoot}`}>
                {f.bookable ? `کمتر از ${faDigits(need)} صندلی خالی دارد.` : "تکمیل ظرفیت یا لغو شده."}
              </p>
            )}
          </li>
        ))}
      </ol>
      <p className={s.disclaim}>
        قیمت‌ها و قوانین از {g.fares[0]?.sellerName}، هنگام جست‌وجو. خرید در سایت فروشنده انجام می‌شود و پیوند به صفحه‌ی نتایج همین
        جست‌وجو در آن سایت می‌رود. جریمه‌ها از جدول فروشنده است، نه تعهد ترب.
      </p>
    </>
  );
}
