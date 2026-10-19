"use client";

import { useState } from "react";
import type { SpecGroup } from "@/lib/types";
import s from "./product.module.css";

export default function Specs({
  keySpecs,
  groups,
}: {
  keySpecs: { key: string; value: string }[];
  groups: SpecGroup[];
}) {
  const [open, setOpen] = useState(false);
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  if (!keySpecs.length && !total) return null;

  let budget = open ? Infinity : 6;
  return (
    <section className={s.section} aria-labelledby="specs-h">
      <h2 id="specs-h" className={s.h2}>
        مشخصات
      </h2>
      {keySpecs.length > 0 && (
        <ul className={s.keySpecs}>
          {keySpecs.map((k) => (
            <li key={k.key}>
              <span>{k.key}</span>
              <b>{k.value}</b>
            </li>
          ))}
        </ul>
      )}
      {groups.map((g) => {
        if (budget <= 0) return null;
        const rows = g.rows.slice(0, budget);
        budget -= rows.length;
        return (
          <div key={g.title} className={s.specGroup}>
            <h3>{g.title}</h3>
            <dl>
              {rows.map((r) => (
                <div key={r.key}>
                  <dt>{r.key}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
      {total > 6 && (
        <button type="button" className={s.more} onClick={() => setOpen((v) => !v)}>
          {open ? "بستن" : "نمایش تمام مشخصات"}
        </button>
      )}
    </section>
  );
}
