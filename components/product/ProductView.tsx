"use client";

import { useEffect, useState } from "react";
import { faDigits, faPrice } from "@/lib/format";
import { toSaved, useSaved } from "@/lib/saved";
import type { Offer, ProductPage } from "@/lib/types";
import Gallery from "./Gallery";
import PriceChart from "./PriceChart";
import SellerList from "./SellerList";
import Similar from "./Similar";
import Specs from "./Specs";
import s from "./product.module.css";

// Product page in Torob's current order (gallery → title/actions → buy box →
// sellers → specs → price history → similar), drawn with the redesign tokens
// and the card's seller language.

export default function ProductView({ p }: { p: ProductPage }) {
  const likes = useSaved("likes");
  const history = useSaved("history");
  const [notify, setNotify] = useState(false);
  const [shared, setShared] = useState(false);

  const snapshot: Pick<Offer, "id" | "title" | "imageUrl" | "minPrice" | "storeCount" | "available"> = {
    id: p.id,
    title: p.title,
    imageUrl: p.images[0] ?? null,
    minPrice: p.minPrice,
    storeCount: p.onlineCount,
    available: p.available,
  };
  const liked = likes.has(p.id);

  // Record the visit once per product.
  const { add: addHistory } = history;
  useEffect(() => {
    addHistory(toSaved(snapshot));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: p.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      // user cancelled
    }
  };

  const f = p.featured;
  const featuredLabel =
    f?.reason === "recommended"
      ? "خرید با ضمانت ترب"
      : f?.reason === "single"
        ? "تنها فروشنده"
        : f?.reason === "inperson"
          ? "خرید حضوری"
          : "ارزان‌ترین";

  return (
    <article className={s.page}>
      <Gallery images={p.images} title={p.title} />

      <section className={s.head}>
        {p.breadcrumbs.length > 1 && (
          <nav className={s.crumbs} aria-label="مسیر دسته‌بندی">
            {p.breadcrumbs.slice(1).map((b, i, arr) => (
              <span key={`${b.catId}-${i}`}>
                <a href={`/browse/${b.catId}`}>{b.title}</a>
                {i < arr.length - 1 && <span aria-hidden> / </span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className={s.title}>{p.title}</h1>
        {p.subtitle && <p className={s.subtitle}>{p.subtitle}</p>}

        <div className={s.actions}>
          <button
            type="button"
            className={s.action}
            aria-pressed={liked}
            onClick={() => (liked ? likes.remove(p.id) : likes.add(toSaved(snapshot)))}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"
                fill={liked ? "var(--color-brand-primary)" : "none"}
                stroke={liked ? "var(--color-brand-primary)" : "currentColor"}
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
            <span>{liked ? "پسندیده شد" : "پسندیدن"}</span>
          </button>
          <button type="button" className={s.action} aria-pressed={notify} onClick={() => setNotify((v) => !v)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 10a6 6 0 1 1 12 0v4l2 3H4l2-3v-4zM10 20a2 2 0 0 0 4 0"
                stroke={notify ? "var(--color-brand-primary)" : "currentColor"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{notify ? "اطلاع از کاهش قیمت" : "خبرم کن"}</span>
          </button>
          <button type="button" className={s.action} onClick={share}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM9 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>{shared ? "کپی شد" : "اشتراک"}</span>
          </button>
        </div>
      </section>

      {/* Buy box: same rule as the card. Main price = lowest; the seller's own price beside it. */}
      <section className={s.buyBox} aria-label="خرید">
        <div className={s.priceRange}>
          {p.available ? (
            <>
              <p className={s.caption}>
                {p.onlineCount > 1 ? `کمترین قیمتِ ${faDigits(p.onlineCount)} فروشگاه` : "قیمت"}
              </p>
              <p className={s.bigPrice}>
                {faPrice(p.minPrice)} <span>تومان</span>
              </p>
              {p.maxPrice > p.minPrice && (
                <p className={s.caption}>
                  تا {faPrice(p.maxPrice)} تومان
                </p>
              )}
            </>
          ) : (
            <p className={s.bigPrice} data-muted>
              ناموجود
            </p>
          )}
        </div>
        {f && (
          <a
            className={s.buyButton}
            href={f.seller.offerUrl ?? p.torobUrl}
            target="_blank"
            rel="noopener"
            data-kind={f.reason}
          >
            <span className={s.buyLabel}>
              {f.reason === "recommended" && <img src="/icons/shield-check.svg" width={14} height={14} alt="" />}
              {featuredLabel}
            </span>
            <span className={s.buyMain}>
              خرید از {f.seller.shopName}
              <b>
                {faPrice(f.seller.price)} <small>تومان</small>
              </b>
            </span>
          </a>
        )}
      </section>

      <SellerList online={p.online} inPerson={p.inPerson} onlineCount={p.onlineCount} inPersonCount={p.inPersonCount} featured={f} />

      <Specs keySpecs={p.keySpecs} groups={p.specs} />

      <PriceChart id={p.id} />

      <Similar id={p.id} />

      <p className={s.footer}>
        {p.source === "sample" ? "داده‌ی نمونه (ذخیره‌شده) · " : ""}
        <a href={p.torobUrl} target="_blank" rel="noopener">
          مشاهده‌ی همین کالا در torob.com
        </a>
      </p>
    </article>
  );
}
