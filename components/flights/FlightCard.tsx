"use client";

import Link from "next/link";
import { useState } from "react";
import { faDigits, faPrice } from "@/lib/format";
import { explainFare, REFUND_BADGE } from "@/lib/flights/explain";
import { durationFa, partyQuery, TICKET_FA } from "@/lib/flights/format";
import { clock } from "@/lib/flights/jalali";
import type { Intent, RankedFlight } from "@/lib/flights/rank";
import type { FlightFare, Party } from "@/lib/flights/types";
import s from "./flights.module.css";

// One merged flight. Same language as the PLP card: the main price is the
// lowest fare; the seller section shows the featured fare with its own price
// and reason. A sponsored fare is never the featured one.

const REASON: Record<Intent, string> = {
  best: "پیشنهاد ترب برای این پرواز",
  cheapest: "ارزان‌ترین پیشنهاد",
  fastest: "ارزان‌ترین پیشنهاد",
  refundable: "ارزان‌ترین پیشنهاد قابل استرداد",
  morning: "پیشنهاد ترب برای این پرواز",
  evening: "پیشنهاد ترب برای این پرواز",
};

const SCARCE = 3;

export default function FlightCard({
  flight,
  intent,
  party,
  best,
}: {
  flight: RankedFlight;
  intent: Intent;
  party: Party;
  /** List-level «بهترین انتخاب ترب»: banner + explanation line. */
  best?: string;
}) {
  const { group: g, lowest, featured, fares } = flight;
  const size = party.adults + party.children + party.infants;
  const shown = featured ?? lowest;
  const href = `/flights/${g.id}?${partyQuery(party)}${intent !== "best" ? `&intent=${intent}` : ""}`;
  const label = `${g.airline.name} ${faDigits(g.flightNumber)}، ${clock(g.departure)} تا ${clock(g.arrival)}، از ${faPrice(lowest.price.adult)} تومان`;

  return (
    <article className={s.card} data-best={best ? "" : undefined} aria-label={label}>
      <Link href={href} className={s.cover} aria-label={`جزئیات ${label}`} prefetch={false} />

      {best && (
        <>
          <div className={s.bestBanner}>
            <span aria-hidden>★</span> بهترین انتخاب ترب
          </div>
          <p className={s.bestWhy}>
            <b>چرا؟ </b>
            {best}
          </p>
        </>
      )}

      <div className={s.body}>
        <div className={s.airline}>
          <AirlineLogo code={g.airline.code} src={g.airline.logo} />
          <span className={s.airlineName}>{g.airline.name}</span>
          <span className={s.flightNo}>
            {faDigits(g.flightNumber)} · {g.aircraft}
          </span>
          {lowest.sponsored && <span className={s.adBadge}>آگهی</span>}
        </div>

        <div className={s.times}>
          <span className={s.time}>
            <span className={s.timeValue}>{clock(g.departure)}</span>
            <span className={s.timeCity}>{g.origin.city}</span>
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

        <FareBadges fare={shown} cabin={g.cabin} />

        <div className={s.price}>
          <div className={s.priceMain}>
            <span className={s.caption}>کمترین قیمت هر نفر</span>
            <span className={s.priceRow}>
              <span className={s.amount}>{faPrice(lowest.price.adult)}</span>
              <span className={s.unit}>تومان</span>
            </span>
            {size > 1 && (
              <span className={s.caption}>
                {faDigits(size)} نفر: {faPrice(lowest.total)} تومان
              </span>
            )}
          </div>
          <span className={s.offers}>{fares.length > 1 ? `در ${faDigits(fares.length)} پیشنهاد` : "۱ پیشنهاد"}</span>
        </div>
      </div>

      {featured && (
        <div className={s.seller}>
          <div className={s.sellerTop}>
            <span className={s.reason}>{featured === lowest && intent !== "refundable" ? "ارزان‌ترین پیشنهاد" : REASON[intent]}</span>
            <span className={s.sellerPrice}>
              {faPrice(featured.total)} <span className={s.unit}>تومان{size > 1 ? ` · ${faDigits(size)} نفر` : ""}</span>
            </span>
          </div>
          <span className={s.sellerName}>
            {featured.sellerName} · {featured.supplierLabel}
          </span>
          {!best && featured !== lowest && (
            <span className={s.sellerWhy}>{explainFare(featured, g, { fare: lowest, group: g, scope: "flight" }, size)}</span>
          )}
        </div>
      )}
    </article>
  );
}

export function FareBadges({ fare, cabin }: { fare: FlightFare; cabin: "economy" | "business" }) {
  const r = fare.refund;
  return (
    <div className={s.badges}>
      <span className={s.badge}>{TICKET_FA[fare.ticketType]}</span>
      {cabin === "business" && <span className={s.badge}>بیزینس</span>}
      <span className={`${s.badge} ${r.kind === "low" ? s.badgeGood : r.kind === "none" ? s.badgeWarn : ""}`}>
        {REFUND_BADGE[r.kind]}
        {r.firstPenalty !== null && ` (${faDigits(r.firstPenalty)}٪)`}
      </span>
      <span className={s.badge}>{fare.baggageKg ? `${faDigits(fare.baggageKg)} کیلو بار` : "بار نامشخص"}</span>
      {fare.seatsLeft !== null && fare.seatsLeft <= SCARCE && (
        <span className={`${s.badge} ${s.badgeWarn}`}>{faDigits(fare.seatsLeft)} صندلی مانده</span>
      )}
    </div>
  );
}

export function AirlineLogo({ code, src }: { code: string; src: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className={s.logoFallback} aria-hidden>
        {code}
      </span>
    );
  }
  return <img className={s.logo} src={src} alt="" width={28} height={28} loading="lazy" onError={() => setFailed(true)} />;
}

export function FlightCardSkeleton() {
  return (
    <div className={`${s.card} ${s.skel}`} aria-hidden>
      <div className={s.body}>
        <span style={{ width: "40%" }} />
        <span style={{ width: "90%", height: 26 }} />
        <span style={{ width: "60%" }} />
        <span style={{ width: "35%", height: 20 }} />
      </div>
      <div className={s.seller}>
        <span style={{ width: "50%" }} />
        <span style={{ width: "70%" }} />
      </div>
    </div>
  );
}
