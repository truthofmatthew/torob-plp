"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { faPrice } from "@/lib/format";
import s from "./product.module.css";

// «تغییرات قیمت». Two series on one axis (lowest, median), 2px lines, legend
// plus end labels so identity is never color-only, crosshair tooltip on hover,
// and a table view. Palette validated with the dataviz checker (light + dark).

type P = { date: string; lowest: number; median: number };
type Range = "3m" | "1y" | "all";
const RANGES: { id: Range; label: string; days: number }[] = [
  { id: "3m", label: "۳ ماه", days: 92 },
  { id: "1y", label: "۱ سال", days: 366 },
  { id: "all", label: "همه", days: Infinity },
];

const W = 336;
const H = 168;
const PAD = { top: 12, right: 8, bottom: 22, left: 8 };
const jalali = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "short", day: "numeric" });
const jalaliMonth = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "2-digit", month: "short" });

export default function PriceChart({ id }: { id: string }) {
  const [points, setPoints] = useState<P[] | null>(null);
  const [range, setRange] = useState<Range>("1y");
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/price-chart?id=${id}`)
      .then((r) => r.json())
      .then((d: { points: P[] }) => alive && setPoints(d.points ?? []))
      .catch(() => alive && setPoints([]));
    return () => {
      alive = false;
    };
  }, [id]);

  const data = useMemo(() => {
    if (!points?.length) return [];
    const days = RANGES.find((r) => r.id === range)!.days;
    const last = new Date(points[points.length - 1].date).getTime();
    const from = last - days * 864e5;
    const inRange = points.filter((p) => new Date(p.date).getTime() >= from);
    // Carry the last earlier value in so the line starts at the range edge.
    const before = points.filter((p) => new Date(p.date).getTime() < from).at(-1);
    return before && days !== Infinity
      ? [{ ...before, date: new Date(from).toISOString().slice(0, 10) }, ...inRange]
      : inRange;
  }, [points, range]);

  if (points && points.length < 2) return null;

  const t0 = data.length ? new Date(data[0].date).getTime() : 0;
  const t1 = data.length ? new Date(data[data.length - 1].date).getTime() : 1;
  const values = data.flatMap((p) => [p.lowest, p.median]);
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const span = vMax - vMin || vMax * 0.1 || 1;
  const lo = vMin - span * 0.08;
  const hi = vMax + span * 0.08;
  // RTL reading: time runs right → left, matching Torob's chart.
  const x = (d: string) => W - PAD.right - ((new Date(d).getTime() - t0) / (t1 - t0 || 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const path = (k: "lowest" | "median") =>
    data.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p[k]).toFixed(1)}`).join("");
  const ticks = [vMin, (vMin + vMax) / 2, vMax];
  const last = data[data.length - 1];
  const h = hover !== null ? data[hover] : null;

  const onMove = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    let bestD = Infinity;
    data.forEach((p, i) => {
      const d = Math.abs(x(p.date) - px);
      if (d < bestD) [best, bestD] = [i, d];
    });
    setHover(best);
  };

  return (
    <section className={s.section} aria-labelledby="chart-h">
      <div className={s.chartHead}>
        <h2 id="chart-h" className={s.h2}>
          تغییرات قیمت
        </h2>
        <div className={s.segment} role="radiogroup" aria-label="بازه">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={range === r.id}
              onClick={() => {
                setRange(r.id);
                setHover(null);
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className={s.legend}>
        <span>
          <i className={s.swatch} data-series="lowest" /> کمترین قیمت
        </span>
        <span>
          <i className={s.swatch} data-series="median" /> میانه‌ی قیمت
        </span>
      </div>

      {!points ? (
        <div className={s.chartSkeleton} aria-label="در حال بارگیری نمودار" />
      ) : (
        <div className={s.chartWrap}>
          <svg
            ref={svg}
            className={s.chart}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`نمودار قیمت؛ آخرین کمترین قیمت ${faPrice(last.lowest)} تومان`}
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className={s.grid} />
                <text x={PAD.left} y={y(t) - 4} className={s.tick} textAnchor="start">
                  {faPrice(Math.round(t / 1000) * 1000)}
                </text>
              </g>
            ))}
            <text x={W - PAD.right} y={H - 6} className={s.tick} textAnchor="end">
              {jalaliMonth.format(new Date(data[0].date))}
            </text>
            <text x={PAD.left} y={H - 6} className={s.tick} textAnchor="start">
              {jalaliMonth.format(new Date(last.date))}
            </text>
            <path d={path("median")} className={s.lineMedian} />
            <path d={path("lowest")} className={s.lineLowest} />
            {h && (
              <g>
                <line x1={x(h.date)} x2={x(h.date)} y1={PAD.top} y2={H - PAD.bottom} className={s.crosshair} />
                <circle cx={x(h.date)} cy={y(h.median)} r={4} className={s.dotMedian} />
                <circle cx={x(h.date)} cy={y(h.lowest)} r={4} className={s.dotLowest} />
              </g>
            )}
          </svg>
          {h && (
            <div
              className={s.tooltip}
              style={{ left: `${(x(h.date) / W) * 100}%` }}
              data-flip={x(h.date) < W / 2 || undefined}
            >
              <b>{jalali.format(new Date(h.date))}</b>
              <span>
                <i className={s.swatch} data-series="lowest" /> کمترین: {faPrice(h.lowest)}
              </span>
              <span>
                <i className={s.swatch} data-series="median" /> میانه: {faPrice(h.median)}
              </span>
            </div>
          )}
        </div>
      )}

      {points && data.length > 0 && (
        <details className={s.table}>
          <summary>نمایش جدول</summary>
          <table>
            <thead>
              <tr>
                <th>تاریخ</th>
                <th>کمترین (تومان)</th>
                <th>میانه (تومان)</th>
              </tr>
            </thead>
            <tbody>
              {[...data]
                .reverse()
                .slice(0, 12)
                .map((p) => (
                  <tr key={p.date}>
                    <td>{jalali.format(new Date(p.date))}</td>
                    <td>{faPrice(p.lowest)}</td>
                    <td>{faPrice(p.median)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
