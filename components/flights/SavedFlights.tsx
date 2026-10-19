"use client";

import Link from "next/link";
import { faPrice } from "@/lib/format";
import { partyQuery } from "@/lib/flights/format";
import { clock, jalaliLong } from "@/lib/flights/jalali";
import { useSavedFlights } from "@/lib/flights/saved";
import s from "./flights.module.css";

/** «خبرم کن» flights saved on this device. The prototype sends no alerts. */
export default function SavedFlights() {
  const saved = useSavedFlights();
  if (!saved.list.length) return null;
  return (
    <section className={s.section} aria-labelledby="saved-h">
      <div className={s.sectionHead}>
        <h2 id="saved-h">پروازهای زیر نظر</h2>
      </div>
      {saved.list.map((f) => (
        <div key={f.id} className={s.recentRow}>
          <Link className={s.recentMain} href={`/flights/${f.id}?${partyQuery(f.query.party)}`} prefetch={false}>
            {f.title}
            <small>
              {jalaliLong(f.date)} · {clock(f.departure)} · هنگام ذخیره از {faPrice(f.minPrice)} تومان
            </small>
          </Link>
          <button type="button" className={s.linkBtn} aria-label={`حذف ${f.title}`} onClick={() => saved.remove(f.id)}>
            حذف
          </button>
        </div>
      ))}
    </section>
  );
}
