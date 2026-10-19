import Link from "next/link";
import ProductGrid from "@/components/ProductGrid";
import Shell from "@/components/Shell";
import s from "@/components/home/home.module.css";
import { getSpecialOffers } from "@/lib/catalog";

// Rendered per request (not at build: the build machine can't reliably reach
// Torob); lib/torob.ts's 5-minute cache keeps upstream calls the same.
export const dynamic = "force-dynamic";
export const metadata = { title: "پیشنهاد ویژه · ترب (نمونه)" };

// Torob's «پیشنهاد ویژه»: titled rows of products, each a horizontal rail of
// the redesigned card.
export default async function SpecialOffers() {
  const { rows, sample } = await getSpecialOffers();
  return (
    <Shell header={{ kind: "title", title: "پیشنهاد ویژه" }}>
      {sample && <p className={s.disclaimer}>اتصال زنده به ترب در دسترس نبود؛ داده‌ی نمونه نمایش داده می‌شود.</p>}
      {rows.map((r, i) => (
        <section key={`${r.title}-${i}`} className={s.section}>
          <div className={s.sectionHead}>
            <h2>
              {r.title}
              {r.subtitle && <small style={{ fontWeight: 400, fontSize: 11, color: "var(--color-text-tertiary)" }}> · {r.subtitle}</small>}
            </h2>
            {r.categoryId && (
              <Link href={`/browse/${r.categoryId}`} prefetch={false}>
                همه
              </Link>
            )}
          </div>
          <ProductGrid offers={r.offers} layout="rail" />
        </section>
      ))}
    </Shell>
  );
}
