"use client";

import Link from "next/link";
import { useState } from "react";
import { faDigits, faPrice } from "@/lib/format";
import type { CardState, FeaturedSeller, Offer } from "@/lib/types";
import Icon from "./Icon";
import SaveActions from "./SaveActions";
import { thumb } from "@/lib/img";
import { toSaved, useSaved } from "@/lib/saved";
import s from "./ProductCard.module.css";

// Figma ProductCard (206:880): 6 states, all 392px tall. Media 148 · Body 126 ·
// Seller 116. Rules: an ad is never "recommended"; purchase protection is
// worded as protection, never authenticity; main price = lowest price, the
// seller section shows that seller's own price.

type Props =
  | { loading: true }
  | {
      loading?: false;
      offer: Offer;
      /** undefined = still loading the sellers; null = none usable. */
      featured: FeaturedSeller | null | undefined;
      position: number;
    };

const LABEL: Record<Exclude<CardState, "loading" | "recommended">, string> = {
  cheapest: "ارزان‌ترین:",
  single: "فروشنده:",
  inperson: "حضوری:",
  unavailable: "آخرین قیمت:",
};

export default function ProductCard(props: Props) {
  if (props.loading) return <SkeletonCard />;
  return <LoadedCard {...props} />;
}

function stateOf(offer: Offer, featured: FeaturedSeller | null | undefined): CardState | "pending" {
  if (!offer.available) return "unavailable";
  if (featured === undefined) return "pending";
  if (!featured) return offer.storeCount === 1 ? "single" : "cheapest";
  return featured.reason;
}

function caption(offer: Offer): string {
  if (!offer.available) return "ناموجود";
  if (offer.storeCount > 1) return `کمترین قیمتِ ${faDigits(offer.storeCount)} فروشگاه`;
  return "قیمت فروشنده";
}

function LoadedCard({
  offer,
  featured,
}: {
  offer: Offer;
  featured: FeaturedSeller | null | undefined;
  position: number;
}) {
  const alerts = useSaved("alerts");
  const notified = alerts.has(offer.id);
  // 0 = thumbnail, 1 = original (thumb failed), 2 = give up → «بدون تصویر».
  const [imgTry, setImgTry] = useState(0);
  const state = stateOf(offer, featured);
  const seller = featured?.seller ?? null;
  // No seller data (upstream down and not in the sample): say how many sellers
  // there are instead of inventing one.
  const sellerName =
    seller?.shopName ??
    offer.singleShopName ??
    (offer.storeCount > 1 ? `${faDigits(offer.storeCount)} فروشنده در ترب` : "");
  const priceText = offer.minPrice > 0 ? faPrice(offer.minPrice) : "—";

  const meta = (() => {
    if (!seller) return "";
    const p = faPrice(seller.price);
    if (state === "inperson") return `${p} تومان · ${seller.distance || seller.city}`;
    if (seller.protectedPurchase) return `${p} با ضمانت`;
    return seller.city ? `${p} تومان · ${seller.city}` : `${p} تومان`;
  })();

  const labelText =
    state === "recommended"
      ? "خرید با ضمانت ترب"
      : state === "pending" || state === "loading" || (state === "cheapest" && !seller)
        ? ""
        : LABEL[state];
  const ariaLabel = `${offer.title}، ${priceText} تومان${sellerName ? `، ${labelText.replace(":", "")} ${sellerName}` : ""}`;
  const imgSrc = imgTry === 0 ? thumb(offer.imageUrl, 280) : offer.imageUrl;
  const showImage = imgSrc && imgTry < 2;

  return (
    <article className={s.card} data-state={state}>
      <Link className={s.cover} href={offer.productUrl} aria-label={ariaLabel} prefetch={false} />

      <div className={s.media}>
        {showImage ? (
          <img
            className={s.image}
            key={imgSrc}
            src={imgSrc!}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgTry((t) => t + 1)}
          />
        ) : (
          <div className={s.noImage}>
            <Icon name="image" />
            <p>بدون تصویر</p>
          </div>
        )}
        {offer.isAd && <span className={s.adBadge}>آگهی</span>}
        <SaveActions product={offer} variant="card" />
      </div>

      <div className={s.body}>
        <h3 className={s.title}>{offer.title}</h3>
        <div className={s.price}>
          <p className={s.caption}>{caption(offer)}</p>
          <div className={s.priceRow}>
            <span className={s.amount}>{priceText}</span>
            {offer.available && <span className={s.unit}>تومان</span>}
            {offer.discountPercent ? <span className={s.discount}>{faDigits(offer.discountPercent)}٪</span> : null}
          </div>
        </div>
      </div>

      <div className={s.seller}>
        {state === "pending" ? (
          <div className={s.sellerSkeleton} aria-label="در حال یافتن فروشنده">
            <span style={{ width: 110, height: 12 }} />
            <span style={{ width: 80, height: 10 }} />
            <span style={{ width: 96, height: 10 }} />
          </div>
        ) : (
          <>
            <SellerName href={seller?.offerUrl ?? null} name={sellerName || "—"} />
            <p className={state === "recommended" ? s.labelProtected : s.label}>{labelText}</p>
            <div className={s.meta}>
              {state === "unavailable" ? (
                <button
                  type="button"
                  className={s.notify}
                  aria-pressed={notified}
                  onClick={() => (notified ? alerts.remove(offer.id) : alerts.add(toSaved(offer)))}
                >
                  <Icon name="bell" size={14} />
                  <span>{notified ? "موجود شد خبرتان می‌کنیم" : "خبرم کن"}</span>
                </button>
              ) : (
                <>
                  {state === "inperson" ? (
                    <Icon name="store" size={14} />
                  ) : seller?.protectedPurchase ? (
                    <Icon name="shield-check" size={14} />
                  ) : null}
                  <p className={state === "recommended" ? s.metaSuccess : s.metaText}>{meta}</p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function SellerName({ href, name }: { href: string | null; name: string }) {
  if (!href) return <p className={s.sellerName}>{name}</p>;
  return (
    <a className={`${s.sellerName} ${s.sellerLink}`} href={href} target="_blank" rel="noopener">
      {name}
    </a>
  );
}

function SkeletonCard() {
  return (
    <article className={s.card} data-state="loading" aria-hidden>
      <div className={`${s.media} ${s.mediaSkeleton}`} />
      <div className={s.body}>
        <div className={s.skelTitle}>
          <span style={{ width: "100%" }} />
          <span style={{ width: 84 }} />
        </div>
        <div className={s.skelPrice}>
          <span style={{ width: 96, height: 10 }} />
          <span style={{ width: 72, height: 14 }} />
        </div>
      </div>
      <div className={s.seller}>
        <div className={s.sellerSkeleton}>
          <span style={{ width: 110, height: 12 }} />
          <span style={{ width: 80, height: 10 }} />
        </div>
      </div>
    </article>
  );
}
