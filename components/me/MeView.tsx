"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ProductGrid from "@/components/ProductGrid";
import { faDigits } from "@/lib/format";
import { savedToOffer, useSaved } from "@/lib/saved";
import s from "./me.module.css";

// «ترب من» without login: likes and recently viewed live on this device.
export default function MeView() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") === "history" ? "history" : "likes";
  const likes = useSaved("likes");
  const history = useSaved("history");
  const active = tab === "likes" ? likes : history;

  return (
    <>
      <div className={s.profile}>
        <div className={s.avatar} aria-hidden>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#1e293b">
            <g transform="translate(2 2)">
              <path d="M18 17v2c0 .6-.4 1-1 1s-1-.4-1-1v-2c0-1.7-1.3-3-3-3H5c-1.7 0-3 1.3-3 3v2c0 .6-.4 1-1 1s-1-.4-1-1v-2c0-2.8 2.2-5 5-5h8c2.8 0 5 2.2 5 5zM4 5c0-2.8 2.2-5 5-5s5 2.2 5 5-2.2 5-5 5-5-2.2-5-5zm2 0c0 1.7 1.3 3 3 3s3-1.3 3-3-1.3-3-3-3-3 1.3-3 3z" />
            </g>
          </svg>
        </div>
        <div>
          <p className={s.name}>کاربر مهمان</p>
          <p className={s.hint}>بدون ورود؛ پسندیده‌ها و بازدیدها فقط روی همین دستگاه ذخیره می‌شوند.</p>
        </div>
      </div>

      <div className={s.tabs} role="tablist">
        {(
          [
            ["likes", "پسندیده‌ها", likes.list.length],
            ["history", "بازدیدهای اخیر", history.list.length],
          ] as const
        ).map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={s.tab}
            onClick={() => router.replace(id === "likes" ? "/me" : "/me?tab=history", { scroll: false })}
          >
            {label} {n > 0 && <span className={s.count}>{faDigits(n)}</span>}
          </button>
        ))}
      </div>

      {active.list.length === 0 ? (
        <div className={s.empty}>
          <p className={s.emptyTitle}>{tab === "likes" ? "هنوز کالایی نپسندیده‌اید" : "هنوز کالایی ندیده‌اید"}</p>
          <p className={s.emptyText}>
            {tab === "likes"
              ? "در صفحه‌ی هر کالا، «پسندیدن» را بزنید تا اینجا بماند."
              : "کالاهایی که باز می‌کنید اینجا جمع می‌شوند."}
          </p>
          <Link href="/" className={s.cta}>
            جست‌وجوی کالا
          </Link>
        </div>
      ) : (
        <>
          <div className={s.toolbar}>
            <span>{faDigits(active.list.length)} کالا</span>
            <button type="button" onClick={active.clear}>
              {tab === "likes" ? "حذف همه" : "پاک کردن تاریخچه"}
            </button>
          </div>
          <ProductGrid offers={active.list.map(savedToOffer)} />
        </>
      )}
    </>
  );
}
