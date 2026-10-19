"use client";

import Icon from "./Icon";
import s from "./FilterBar.module.css";

// Figma "Filters" (206:1055) + "Location" (206:1063 / 206:4564).

type Props = {
  inPerson: boolean;
  sortLabel: string;
  filterCount: number;
  onToggleInPerson: () => void;
  onOpenSort: () => void;
  onOpenFilters: () => void;
  city: string | null;
  locating: boolean;
  onLocate: () => void;
};

export default function FilterBar(p: Props) {
  return (
    <div className={s.wrap}>
      <div className={s.chips} role="toolbar" aria-label="فیلتر و مرتب‌سازی">
        <button type="button" className={s.chip} onClick={p.onOpenFilters} aria-haspopup="dialog">
          <span>{p.filterCount ? `فیلترها (${p.filterCount.toLocaleString("fa-IR")})` : "فیلترها"}</span>
          <Icon name="filter" size={14} />
        </button>
        <button type="button" className={s.chip} onClick={p.onOpenSort} aria-haspopup="dialog">
          <span>مرتب‌سازی: {p.sortLabel}</span>
        </button>
        <button
          type="button"
          className={s.chip}
          aria-pressed={p.inPerson}
          data-active={p.inPerson || undefined}
          onClick={p.onToggleInPerson}
        >
          <span>خرید حضوری</span>
        </button>
      </div>

      <div className={s.location}>
        <Icon name="pin" />
        <div className={s.locText}>
          {p.city ? (
            <>
              <p className={s.locTitle}>موقعیت دقیق شما: {p.city}</p>
              <p className={s.locSub}>فاصله‌ی فروشگاه‌های حضوری از این نقطه</p>
            </>
          ) : (
            <>
              <p className={s.locTitle}>موقعیت شما مشخص نیست</p>
              <p className={s.locSub}>برای دیدن فاصله، موقعیت را تعیین کنید</p>
            </>
          )}
        </div>
        <button type="button" className={s.locAction} onClick={p.onLocate} disabled={p.locating}>
          {p.locating ? "…" : p.city ? "تغییر" : "تعیین"}
        </button>
      </div>
    </div>
  );
}
