"use client";

import { toSaved, useSaved } from "@/lib/saved";
import type { Offer } from "@/lib/types";
import s from "./SaveActions.module.css";

// Torob's like (heart) + notify (bell) pair. Saved on this device and listed
// in «ترب من». `variant="card"` = compact round buttons over the card image;
// `variant="page"` = labelled pills on the product page.

type Snapshot = Pick<Offer, "id" | "title" | "imageUrl" | "minPrice" | "storeCount" | "available">;

export function HeartIcon({ on, size = 20 }: { on: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"
        fill={on ? "var(--color-brand-primary)" : "none"}
        stroke={on ? "var(--color-brand-primary)" : "currentColor"}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BellIcon({ on, size = 20 }: { on: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M6 10a6 6 0 1 1 12 0v4l2 3H4l2-3v-4z"
        fill={on ? "var(--color-brand-primary)" : "none"}
        stroke={on ? "var(--color-brand-primary)" : "currentColor"}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M10 20a2 2 0 0 0 4 0" fill="none" stroke={on ? "var(--color-brand-primary)" : "currentColor"} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function SaveActions({ product, variant }: { product: Snapshot; variant: "card" | "page" }) {
  const likes = useSaved("likes");
  const alerts = useSaved("alerts");
  const liked = likes.has(product.id);
  const watching = alerts.has(product.id);

  const toggle = (e: React.MouseEvent, store: typeof likes, on: boolean) => {
    // Inside a card, don't let the tap fall through to the card link.
    e.preventDefault();
    e.stopPropagation();
    if (on) store.remove(product.id);
    else store.add(toSaved(product));
  };

  const likeLabel = liked ? "حذف از پسندیده‌ها" : "پسندیدن";
  const bellLabel = watching ? "لغو خبرم کن" : product.available ? "خبرم کن (کاهش قیمت)" : "خبرم کن (موجود شدن)";

  if (variant === "card") {
    return (
      <div className={s.card}>
        <button
          type="button"
          className={s.round}
          aria-pressed={liked}
          aria-label={likeLabel}
          title={likeLabel}
          onClick={(e) => toggle(e, likes, liked)}
        >
          <HeartIcon on={liked} size={18} />
        </button>
        <button
          type="button"
          className={s.round}
          aria-pressed={watching}
          aria-label={bellLabel}
          title={bellLabel}
          onClick={(e) => toggle(e, alerts, watching)}
        >
          <BellIcon on={watching} size={18} />
        </button>
      </div>
    );
  }

  return (
    <>
      <button type="button" className={s.pill} aria-pressed={liked} onClick={(e) => toggle(e, likes, liked)}>
        <HeartIcon on={liked} />
        <span>{liked ? "پسندیده شد" : "پسندیدن"}</span>
      </button>
      <button type="button" className={s.pill} aria-pressed={watching} onClick={(e) => toggle(e, alerts, watching)}>
        <BellIcon on={watching} />
        <span>{watching ? "خبرتان می‌کنیم" : "خبرم کن"}</span>
      </button>
    </>
  );
}
