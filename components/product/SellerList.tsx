"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { faDigits, faPrice } from "@/lib/format";
import type { FeaturedSeller, SellerOffer } from "@/lib/types";
import s from "./product.module.css";

// Torob's «فروشنده‌ها» block: online / in-person tabs, a guarantee filter,
// one row per seller. Real Torob values only: we never compute a rating.

const PAGE = 8;

export default function SellerList({
  online,
  inPerson,
  onlineCount,
  inPersonCount,
  featured,
}: {
  online: SellerOffer[];
  inPerson: SellerOffer[];
  onlineCount: number;
  inPersonCount: number;
  featured: FeaturedSeller | null;
}) {
  const [tab, setTab] = useState<"online" | "inperson">(online.length || !inPerson.length ? "online" : "inperson");
  const [protectedOnly, setProtectedOnly] = useState(false);
  const [cheapFirst, setCheapFirst] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const list = useMemo(() => {
    let l = tab === "online" ? online : inPerson;
    if (tab === "online" && protectedOnly) l = l.filter((x) => x.protectedPurchase);
    if (cheapFirst) l = [...l].sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
    return l;
  }, [tab, online, inPerson, protectedOnly, cheapFirst]);

  const protectedCount = online.filter((x) => x.protectedPurchase).length;
  const isFeatured = (x: SellerOffer) =>
    featured && featured.seller.shopId === x.shopId && featured.seller.price === x.price && featured.seller.inPerson === x.inPerson;

  if (!online.length && !inPerson.length) return null;

  return (
    <section className={s.section} aria-labelledby="sellers-h">
      <h2 id="sellers-h" className={s.h2}>
        فروشنده‌ها
      </h2>

      <div className={s.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "online"}
          className={s.tab}
          onClick={() => {
            setTab("online");
            setShown(PAGE);
          }}
        >
          خرید اینترنتی <span className={s.count}>{faDigits(onlineCount)}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "inperson"}
          className={s.tab}
          disabled={!inPerson.length}
          onClick={() => {
            setTab("inperson");
            setShown(PAGE);
          }}
        >
          خرید حضوری <span className={s.count}>{faDigits(inPersonCount)}</span>
        </button>
      </div>

      <div className={s.chips}>
        <button type="button" className={s.chip} aria-pressed={cheapFirst} onClick={() => setCheapFirst((v) => !v)}>
          ارزان‌ترین اول
        </button>
        {tab === "online" && protectedCount > 0 && (
          <button
            type="button"
            className={s.chip}
            aria-pressed={protectedOnly}
            onClick={() => setProtectedOnly((v) => !v)}
          >
            <Icon name="shield-check" size={14} />
            دارای ضمانت ترب ({faDigits(protectedCount)})
          </button>
        )}
      </div>

      <ul className={s.sellers}>
        {list.slice(0, shown).map((x, i) => (
          <li key={`${x.shopId}-${x.price}-${i}`} className={s.seller} data-featured={isFeatured(x) || undefined}>
            <div className={s.sellerTop}>
              <p className={s.sellerName}>{x.shopName}</p>
              {x.city && <span className={s.sellerCity}>{x.city}</span>}
              {x.isAd && <span className={s.ad}>آگهی</span>}
            </div>
            {isFeatured(x) && featured?.reason === "recommended" && (
              <p className={s.recommended}>خرید با ضمانت ترب · پیشنهاد این صفحه</p>
            )}
            {x.scoreText && <p className={s.sellerMeta}>{x.scoreText}</p>}
            {x.offerTitle && <p className={s.offerTitle}>{x.offerTitle}</p>}
            {x.inPerson ? (
              <>
                {x.address && <p className={s.sellerMeta}>{x.address}</p>}
                {(x.hours || x.distance) && (
                  <p className={s.sellerMeta}>
                    <Icon name="store" size={14} /> {[x.hours, x.distance].filter(Boolean).join(" · ")}
                  </p>
                )}
              </>
            ) : (
              <>
                {x.protectedPurchase && (
                  <p className={s.protected}>
                    <Icon name="shield-check" size={14} /> خرید با ضمانت ترب
                  </p>
                )}
                {x.notes[0] && <p className={s.sellerMeta}>{x.notes[0]}</p>}
              </>
            )}
            <div className={s.sellerBottom}>
              <p className={s.sellerPrice}>
                {x.available && x.price > 0 ? (
                  <>
                    {faPrice(x.price)} <span>تومان</span>
                  </>
                ) : (
                  <span>ناموجود</span>
                )}
              </p>
              {x.offerUrl && (
                <a className={s.sellerBtn} href={x.offerUrl} target="_blank" rel="noopener">
                  {x.buttonText}
                </a>
              )}
            </div>
            {x.lastChange && <p className={s.updated}>به‌روزرسانی قیمت: {x.lastChange}</p>}
          </li>
        ))}
      </ul>

      {list.length > shown && (
        <button type="button" className={s.more} onClick={() => setShown((n) => n + PAGE * 2)}>
          نمایش {faDigits(Math.min(list.length - shown, PAGE * 2))} فروشنده‌ی دیگر
        </button>
      )}
    </section>
  );
}
