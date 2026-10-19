"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { faDigits, faPrice } from "@/lib/format";
import { cityOf } from "@/lib/flights/airports";
import { explainBest } from "@/lib/flights/explain";
import { partyFa, partySize, searchHref, shortPrice } from "@/lib/flights/format";
import { jalaliLong, jalaliShort, jalaliWeekday } from "@/lib/flights/jalali";
import { INTENTS, rankFlights, type Intent } from "@/lib/flights/rank";
import { SELLER_NAME } from "@/lib/flights/normalize";
import { recentId, useRecentSearches } from "@/lib/flights/saved";
import type { CalendarResponse, FlightQuery, FlightSearchResponse } from "@/lib/flights/types";
import FlightCard, { FlightCardSkeleton } from "./FlightCard";
import p from "@/components/SearchPage.module.css";
import s from "./flights.module.css";

type Status = "loading" | "ready" | "error";

export default function FlightResults({ query, intent: initialIntent, bag: initialBag }: { query: FlightQuery; intent: Intent; bag: number }) {
  const router = useRouter();
  const recent = useRecentSearches();
  const [intent, setIntent] = useState<Intent>(initialIntent);
  const [bag, setBag] = useState(initialBag);
  const [data, setData] = useState<FlightSearchResponse | null>(null);
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const reqId = useRef(0);

  const qs = useMemo(() => {
    const sp = new URLSearchParams({
      from: query.from,
      to: query.to,
      date: query.date,
      adults: String(query.party.adults),
      children: String(query.party.children),
      infants: String(query.party.infants),
    });
    return sp.toString();
  }, [query]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setStatus("loading");
    try {
      const res = await fetch(`/api/flights/search?${qs}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as FlightSearchResponse;
      if (id !== reqId.current) return;
      setData(json);
      setStatus("ready");
    } catch {
      if (id === reqId.current) setStatus("error");
    }
  }, [qs]);

  useEffect(() => {
    void load();
    // The calendar is optional: if it fails the strip just isn't shown.
    let live = true;
    fetch(`/api/flights/calendar?${qs}`)
      .then((r) => (r.ok ? (r.json() as Promise<CalendarResponse>) : null))
      .then((c) => live && setCalendar(c))
      .catch(() => live && setCalendar(null));
    recent.add({ ...query, id: recentId(query), at: Date.now() });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recent.add is stable per key; re-run only on a new query
  }, [qs, load]);

  // Intent and baggage live in the URL so a shared link opens the same view.
  const setView = (next: { intent?: Intent; bag?: number }) => {
    const i = next.intent ?? intent;
    const b = next.bag ?? bag;
    setIntent(i);
    setBag(b);
    router.replace(searchHref(query, { intent: i, bag: b }), { scroll: false });
  };

  const ranked = useMemo(
    () => (data ? rankFlights(data.groups, query.party, intent, { minBaggageKg: bag || undefined }) : null),
    [data, query.party, intent, bag],
  );
  const size = partySize(query.party);
  const stale = status === "loading" && !!data;
  const cheapestDay = calendar?.days.reduce<number | null>((m, d) => (d.minPrice && (m === null || d.minPrice < m) ? d.minPrice : m), null);

  return (
    <>
      <div className={s.bar}>
        <div className={s.summary}>
          <div>
            <h1 className={s.summaryRoute}>
              {cityOf(query.from)} ← {cityOf(query.to)}
            </h1>
            <p className={s.summaryMeta}>
              {jalaliLong(query.date)} · {partyFa(query.party)}
            </p>
          </div>
          <Link className={s.editBtn} href={`/flights?${qs}`} prefetch={false}>
            تغییر
          </Link>
        </div>

        <div className={s.chips} role="toolbar" aria-label="هدف جست‌وجو">
          {INTENTS.map((i) => (
            <button
              key={i.id}
              type="button"
              className={s.chip}
              aria-pressed={intent === i.id}
              onClick={() => setView({ intent: i.id })}
            >
              {intent === i.id && (
                <span className={s.chipCheck} aria-hidden>
                  ✓
                </span>
              )}
              {i.label}
            </button>
          ))}
          {bag > 0 && (
            <button type="button" className={s.chip} aria-pressed="true" onClick={() => setView({ bag: 0 })} aria-label={`حذف فیلتر بار حداقل ${bag} کیلو`}>
              بار ≥ {faDigits(bag)} کیلو
              <span className={s.chipRemove} aria-hidden>
                ×
              </span>
            </button>
          )}
        </div>

        {calendar && calendar.days.some((d) => d.minPrice) && (
          <nav className={s.calendar} aria-label="ارزان‌ترین قیمت روزهای نزدیک">
            {calendar.days.map((d) => {
              const current = d.date === query.date;
              const isCheapest = d.minPrice !== null && d.minPrice === cheapestDay;
              return (
                <Link
                  key={d.date}
                  className={s.calDay}
                  href={searchHref({ ...query, date: d.date }, { intent, bag })}
                  aria-current={current ? "date" : undefined}
                  aria-label={`${jalaliLong(d.date)}: ${d.minPrice ? `از ${faPrice(d.minPrice)} تومان` : "قیمتی نیست"}${isCheapest ? "، ارزان‌ترین روز" : ""}`}
                  prefetch={false}
                  replace
                >
                  <span>{jalaliWeekday(d.date)}</span>
                  <span className={s.calDate}>{jalaliShort(d.date)}</span>
                  <span className={`${s.calPrice} ${d.minPrice ? "" : s.calNone}`}>{d.minPrice ? shortPrice(d.minPrice) : "—"}</span>
                  {isCheapest && <span className={s.calCheapest}>ارزان‌ترین</span>}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <div className={`${p.progress}`} data-on={stale || undefined} aria-hidden />

      {data?.source === "sample" && data.note && status === "ready" && (
        <p className={p.note} role="status">
          {data.note}
        </p>
      )}

      {status === "loading" && !data ? (
        <div className={s.list} aria-busy="true" aria-label="در حال جست‌وجوی پروازها">
          {Array.from({ length: 4 }, (_, i) => (
            <FlightCardSkeleton key={i} />
          ))}
        </div>
      ) : status === "error" && !data ? (
        <div className={p.state} role="alert">
          <p className={p.stateTitle}>جست‌وجو انجام نشد</p>
          <p className={p.stateText}>اتصال به منبع پروازها برقرار نشد.</p>
          <button type="button" className={p.retry} onClick={() => void load()}>
            تلاش دوباره
          </button>
        </div>
      ) : ranked && ranked.flights.length === 0 ? (
        <div className={p.state} role="status">
          <p className={p.stateTitle}>نتیجه‌ای پیدا نشد</p>
          <p className={p.stateText}>
            {data?.groups.length
              ? "با این فیلترها پروازی نماند. هدف دیگری را امتحان کنید یا تعداد مسافران را کم کنید."
              : "برای این مسیر و تاریخ پروازی پیدا نشد. روز دیگری را از نوار بالا امتحان کنید."}
          </p>
          {(intent !== "best" || bag > 0) && (
            <button type="button" className={p.retry} onClick={() => setView({ intent: "best", bag: 0 })}>
              نمایش همه‌ی پروازها
            </button>
          )}
        </div>
      ) : ranked ? (
        <>
          <p className={s.mergeNote}>
            {faDigits(data!.offerCount)} پیشنهاد از {SELLER_NAME} ← {faDigits(data!.groups.length)} پرواز (هر پرواز یک کارت)
          </p>
          <div className={s.list} data-stale={stale || undefined}>
            {ranked.flights.map((f) => (
              <FlightCard
                key={f.group.id}
                flight={f}
                intent={intent}
                party={query.party}
                best={ranked.best === f ? explainBest(f, ranked.context, size) : undefined}
              />
            ))}
          </div>
          <HiddenNote hidden={ranked.hidden} seats={query.party.adults + query.party.children} />
        </>
      ) : null}
    </>
  );
}

function HiddenNote({ hidden, seats }: { hidden: { noSeats: number; unavailable: number; outsideIntent: number }; seats: number }) {
  const parts: string[] = [];
  if (hidden.noSeats) parts.push(`${faDigits(hidden.noSeats)} پرواز کمتر از ${faDigits(seats)} صندلی خالی دارد`);
  if (hidden.unavailable) parts.push(`${faDigits(hidden.unavailable)} پرواز تکمیل یا لغو شده`);
  if (hidden.outsideIntent) parts.push(`${faDigits(hidden.outsideIntent)} پرواز با این هدف یا فیلتر جور نیست`);
  if (!parts.length) return null;
  return <p className={s.hiddenNote}>پنهان شده: {parts.join("؛ ")}.</p>;
}
