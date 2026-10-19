import Link from "next/link";
import HomeSearch from "@/components/home/HomeSearch";
import RecentRail from "@/components/home/RecentRail";
import s from "@/components/home/home.module.css";
import ProductGrid from "@/components/ProductGrid";
import TorobBottomNav from "@/components/torob/TorobBottomNav";
import { getCategory, getSpecialOffers, getTrends } from "@/lib/catalog";

// Torob's home: logo, search box, then what to search. Torob's own service
// tiles (gold, TorobPay, nearby) belong to other products and are left out.

// Rendered per request (not at build: the build machine can't reliably reach
// Torob); lib/torob.ts's 5-minute cache keeps upstream calls the same.
export const dynamic = "force-dynamic";
export const metadata = { title: "ترب | بهترین قیمت بازار (نمونه‌ی بازطراحی)" };

export default async function Home() {
  const [trends, root, offers] = await Promise.all([getTrends(), getCategory(0), getSpecialOffers()]);
  const firstRow = offers.rows[0];

  return (
    <>
      <main className={s.main}>
        <div className={s.hero}>
          <TorobLogo />
          <HomeSearch />
        </div>

        {trends.length > 0 && (
          <section className={s.section}>
            <div className={s.sectionHead}>
              <h2>جست‌وجوهای پرطرفدار</h2>
            </div>
            <ul className={s.trends}>
              {trends.slice(0, 12).map((t) => (
                <li key={t.query}>
                  <Link href={`/search?query=${encodeURIComponent(t.query)}`} prefetch={false}>
                    {t.offer?.imageUrl && <img src={t.offer.imageUrl} alt="" width={28} height={28} loading="lazy" />}
                    <span>{t.query}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {root && root.children.length > 0 && (
          <section className={s.section}>
            <div className={s.sectionHead}>
              <h2>دسته‌بندی‌ها</h2>
              <Link href="/categories">همه</Link>
            </div>
            <ul className={s.catGrid}>
              {root.children.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <Link href={c.hasChildren ? `/categories/${c.id}` : `/browse/${c.id}`} prefetch={false}>
                    <span className={s.catIcon}>
                      {c.icon ? <img src={c.icon} alt="" width={28} height={28} loading="lazy" /> : null}
                    </span>
                    <span className={s.catTitle}>{c.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {firstRow && (
          <section className={s.section}>
            <div className={s.sectionHead}>
              <h2>{firstRow.title}</h2>
              <Link href="/special-offers">پیشنهادهای ویژه</Link>
            </div>
            <ProductGrid offers={firstRow.offers.slice(0, 10)} layout="rail" />
          </section>
        )}

        <RecentRail />

        <p className={s.disclaimer}>نمونه‌ی بازطراحی برای چالش استخدامی؛ نسخه‌ی رسمی ترب نیست.</p>
      </main>
      <TorobBottomNav />
    </>
  );
}

function TorobLogo() {
  return (
    <svg className={s.logo} xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 88 88" role="img" aria-label="ترب">
      <g fill="none">
        <path fill="#e91e33" d="M79.245 20.322l-.627.726c-2.474 2.656-5.814 4.2-9.462 4.313-.16.023-.342.023-.502.023-.456 0-.878-.023-1.31-.068 8.595 10.1 9.895 24.968 2.222 36.579-7.638 11.542-21.774 16.252-34.428 12.484h-.08c-5.13-1.34-10.944.68-14.022 5.414 3.192-4.847 2.736-11.055-.798-15.322v-.045c-8.333-10.079-9.473-24.72-1.87-36.16C26.692 15.67 42.766 11.22 56.195 17.031c-.57-1.476-.935-3.065-1.026-4.688-.114-2.95.741-5.788 2.371-8.171-18.012-5.902-38.532.567-49.476 17.137C-5.104 41.171.425 67.842 20.261 80.893c19.882 13.064 46.592 7.502 59.702-12.246 10.032-15.174 9.177-34.331-.707-48.348l-.011.023z" />
        <path fill="#bf0f22" d="M31.969 10.22c-10.91 1.08-20.463 5.721-24.054 11.191C-5.195 41.216.3 67.853 20.193 80.905l.73-1.112c3.191-4.847 2.735-11.055-.799-15.322v-.045c-8.22-10.079-9.36-24.72-1.835-36.16C26.61 15.67 42.685 11.22 56.114 17.031c0 0-11.4-8.059-24.122-6.81h-.023z" />
        <path fill="#6fbc23" d="M62.544 22.32s-.342-4.086 1.482-7.037c1.824-2.951 5.7-5.845 10.602-5.539 4.925.307 5.723 1.442 5.723 1.442s.114 3.972-1.254 6.242-4.218 5.606-8.322 6.446c-4.104.829-8.231-1.555-8.231-1.555z" />
        <path fill="#519a23" d="M61.062 21.173s-.456-3.972 2.28-7.944c2.736-3.973 5.7-4.563 5.7-4.563S68.7 3.218 66.078.608c.228-.057-3.124.08-6.042 3.291-2.577 2.815-4.104 7.264-2.964 11.577 1.14 4.312 3.99 5.697 3.99 5.697z" />
      </g>
    </svg>
  );
}
