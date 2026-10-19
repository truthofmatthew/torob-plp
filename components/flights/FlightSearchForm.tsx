"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Sheet from "@/components/Sheet";
import { faDigits } from "@/lib/format";
import { cityOf, searchAirports } from "@/lib/flights/airports";
import { searchHref } from "@/lib/flights/format";
import { addDaysG, jalaliLong, toJalali, todayG } from "@/lib/flights/jalali";
import { parseFlightQuery, type ParsedQuery } from "@/lib/flights/parse";
import type { Intent } from "@/lib/flights/rank";
import { recentId, useRecentSearches } from "@/lib/flights/saved";
import type { FlightQuery, Party } from "@/lib/flights/types";
import s from "./flights.module.css";

const DAYS_AHEAD = 60;

export default function FlightSearchForm({ initial }: { initial?: Partial<FlightQuery> }) {
  const router = useRouter();
  const recent = useRecentSearches();
  const [from, setFrom] = useState(initial?.from ?? "THR");
  const [to, setTo] = useState(initial?.to ?? "");
  const [date, setDate] = useState(initial?.date ?? toJalali(addDaysG(todayG(), 1)));
  const [party, setParty] = useState<Party>(initial?.party ?? { adults: 1, children: 0, infants: 0 });
  const [sheet, setSheet] = useState<null | "from" | "to" | "date" | "pax">(null);
  const [ask, setAsk] = useState("");
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [error, setError] = useState("");

  // Typing a sentence fills the form live; the chips show what was understood.
  const onAsk = (v: string) => {
    setAsk(v);
    const p = v.trim() ? parseFlightQuery(v) : null;
    setParsed(p);
    if (!p) return;
    if (p.from) setFrom(p.from);
    if (p.to) setTo(p.to);
    if (p.date) setDate(p.date);
    if (p.party) setParty(p.party);
  };

  const submit = () => {
    if (!to) return setError("مقصد را انتخاب کنید.");
    if (from === to) return setError("مبدأ و مقصد یکی است.");
    setError("");
    const q: FlightQuery = { from, to, date, party };
    recent.add({ ...q, id: recentId(q), at: Date.now() });
    router.push(searchHref(q, { intent: parsed?.intent as Intent | undefined, bag: parsed?.minBaggageKg }));
  };

  const paxCount = party.adults + party.children + party.infants;

  return (
    <>
      <form
        className={s.ask}
        role="search"
        aria-label="جست‌وجوی پرواز با یک جمله"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          className={s.askInput}
          value={ask}
          onChange={(e) => onAsk(e.target.value)}
          placeholder="مثلاً: مشهد پنجشنبه صبح، ۳ نفر، بار زیاد"
          aria-describedby="ask-hint"
          enterKeyHint="search"
        />
        <button type="submit" className={s.askBtn}>
          جست‌وجو
        </button>
      </form>
      <div className={s.tokens} id="ask-hint" aria-live="polite">
        {parsed?.tokens.length ? (
          parsed.tokens.map((t) => (
            <span key={t.kind} className={s.token}>
              {t.text}
            </span>
          ))
        ) : (
          <span className={s.tokenHint}>
            {ask.trim() ? "چیزی تشخیص داده نشد؛ از فرم زیر استفاده کنید." : "یک جمله بنویسید یا فرم زیر را پر کنید."}
          </span>
        )}
      </div>

      <div className={s.form}>
        <div className={s.route}>
          <FieldButton label="مبدأ" onClick={() => setSheet("from")} value={from ? cityOf(from) : ""} sub={from} placeholder="انتخاب مبدأ" />
          <FieldButton label="مقصد" onClick={() => setSheet("to")} value={to ? cityOf(to) : ""} sub={to} placeholder="انتخاب مقصد" />
          <button
            type="button"
            className={s.swap}
            aria-label="جابه‌جایی مبدأ و مقصد"
            onClick={() => {
              setFrom(to || from);
              setTo(from);
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <FieldButton label="تاریخ رفت" onClick={() => setSheet("date")} value={jalaliLong(date)} />
        <FieldButton label="مسافران" onClick={() => setSheet("pax")} value={`${faDigits(paxCount)} مسافر`} />
      </div>
      {error && (
        <p className={s.formError} role="alert">
          {error}
        </p>
      )}
      <button type="button" className={s.submit} onClick={submit}>
        جست‌وجوی پرواز
      </button>

      <AirportSheet
        open={sheet === "from" || sheet === "to"}
        title={sheet === "from" ? "مبدأ" : "مقصد"}
        selected={sheet === "from" ? from : to}
        onClose={() => setSheet(null)}
        onPick={(code) => {
          if (sheet === "from") setFrom(code);
          else setTo(code);
          setSheet(null);
        }}
      />
      <DateSheet open={sheet === "date"} value={date} onClose={() => setSheet(null)} onPick={(d) => (setDate(d), setSheet(null))} />
      <PaxSheet open={sheet === "pax"} value={party} onClose={() => setSheet(null)} onChange={setParty} />
    </>
  );
}

function FieldButton(p: { label: string; value: string; sub?: string; placeholder?: string; onClick: () => void }) {
  return (
    <button type="button" className={s.field} onClick={p.onClick} aria-haspopup="dialog">
      <span className={s.fieldLabel}>{p.label}</span>
      {p.value ? (
        <span className={s.fieldValue}>
          {p.value}
          {p.sub && <small>{p.sub}</small>}
        </span>
      ) : (
        <span className={s.fieldPlaceholder}>{p.placeholder}</span>
      )}
    </button>
  );
}

function AirportSheet(p: { open: boolean; title: string; selected: string; onClose: () => void; onPick: (code: string) => void }) {
  const [q, setQ] = useState("");
  const list = searchAirports(q);
  return (
    <Sheet open={p.open} title={p.title} onClose={p.onClose}>
      <input
        className={s.sheetSearch}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="نام شهر یا فرودگاه"
        aria-label="جست‌وجوی فرودگاه"
      />
      <div className={s.sheetList}>
        {list.map((a) => (
          <button key={a.code} type="button" className={s.airportRow} aria-pressed={a.code === p.selected} onClick={() => p.onPick(a.code)}>
            <span>
              {a.city}
              {a.code === p.selected && " ✓"}
              <small>فرودگاه {a.name}</small>
            </span>
            <span className={s.code}>{a.code}</span>
          </button>
        ))}
        {!list.length && <p className={s.tokenHint}>فرودگاهی با این نام نیست.</p>}
      </div>
    </Sheet>
  );
}

const monthFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "long", year: "numeric", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric", timeZone: "UTC" });
const WEEK = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

function DateSheet(p: { open: boolean; value: string; onClose: () => void; onPick: (j: string) => void }) {
  // Next 60 days, grouped by Jalali month, aligned to a Saturday-first week.
  const months = useMemo(() => {
    const today = todayG();
    const out: { title: string; cells: ({ j: string; label: string; full: string } | null)[] }[] = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const g = addDaysG(today, i);
      const d = new Date(`${g}T12:00:00Z`);
      const title = monthFmt.format(d);
      let m = out[out.length - 1];
      if (!m || m.title !== title) {
        m = { title, cells: [] };
        const lead = (d.getUTCDay() + 1) % 7; // Saturday = 0
        for (let k = 0; k < lead; k++) m.cells.push(null);
        out.push(m);
      }
      m.cells.push({ j: toJalali(g), label: dayFmt.format(d), full: jalaliLong(toJalali(g)) });
    }
    return out;
  }, []);

  return (
    <Sheet open={p.open} title="تاریخ رفت" onClose={p.onClose}>
      <div className={s.sheetList}>
        {months.map((m) => (
          <div key={m.title}>
            <p className={s.month}>{m.title}</p>
            <div className={s.days} role="group" aria-label={m.title}>
              {WEEK.map((w) => (
                <span key={w} className={s.dayHead} aria-hidden>
                  {w}
                </span>
              ))}
              {m.cells.map((c, i) =>
                c ? (
                  <button key={c.j} type="button" className={s.day} aria-pressed={c.j === p.value} aria-label={c.full} onClick={() => p.onPick(c.j)}>
                    {c.label}
                  </button>
                ) : (
                  <span key={`x${i}`} />
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

function PaxSheet(p: { open: boolean; value: Party; onClose: () => void; onChange: (v: Party) => void }) {
  const v = p.value;
  const seats = v.adults + v.children;
  const rows: { key: keyof Party; label: string; hint: string; min: number; max: number }[] = [
    { key: "adults", label: "بزرگسال", hint: "۱۲ سال به بالا", min: 1, max: 9 - v.children },
    { key: "children", label: "کودک", hint: "۲ تا ۱۲ سال", min: 0, max: 9 - v.adults },
    { key: "infants", label: "نوزاد", hint: "زیر ۲ سال، بدون صندلی", min: 0, max: v.adults },
  ];
  return (
    <Sheet open={p.open} title="مسافران" onClose={p.onClose}>
      {rows.map((r) => (
        <div key={r.key} className={s.paxRow}>
          <span>
            {r.label}
            <small>{r.hint}</small>
          </span>
          <span className={s.stepper}>
            <button
              type="button"
              className={s.stepBtn}
              aria-label={`یک ${r.label} کمتر`}
              disabled={v[r.key] <= r.min}
              onClick={() => {
                const next = { ...v, [r.key]: v[r.key] - 1 };
                next.infants = Math.min(next.infants, next.adults);
                p.onChange(next);
              }}
            >
              −
            </button>
            <span className={s.stepVal} aria-live="polite">
              {faDigits(v[r.key])}
            </span>
            <button
              type="button"
              className={s.stepBtn}
              aria-label={`یک ${r.label} بیشتر`}
              disabled={v[r.key] >= r.max}
              onClick={() => p.onChange({ ...v, [r.key]: v[r.key] + 1 })}
            >
              +
            </button>
          </span>
        </div>
      ))}
      <p className={s.tokenHint}>{faDigits(seats)} صندلی لازم است؛ پروازهای با صندلی کمتر نشان داده نمی‌شوند.</p>
      <button type="button" className={s.sheetDone} onClick={p.onClose}>
        تأیید
      </button>
    </Sheet>
  );
}

export function RecentSearches() {
  const recent = useRecentSearches();
  if (!recent.list.length) return null;
  return (
    <section className={s.section} aria-labelledby="recent-h">
      <div className={s.sectionHead}>
        <h2 id="recent-h">جست‌وجوهای اخیر</h2>
        <button type="button" className={s.linkBtn} onClick={recent.clear}>
          پاک کردن
        </button>
      </div>
      {recent.list.map((r) => (
        <div key={r.id} className={s.recentRow}>
          <Link className={s.recentMain} href={searchHref(r)} prefetch={false}>
            {cityOf(r.from)} ← {cityOf(r.to)}
            <small>
              {jalaliLong(r.date)} · {faDigits(r.party.adults + r.party.children + r.party.infants)} مسافر
            </small>
          </Link>
          <button type="button" className={s.linkBtn} aria-label={`حذف ${cityOf(r.from)} به ${cityOf(r.to)}`} onClick={() => recent.remove(r.id)}>
            حذف
          </button>
        </div>
      ))}
    </section>
  );
}

