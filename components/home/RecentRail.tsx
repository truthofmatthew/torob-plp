"use client";

import Link from "next/link";
import ProductGrid from "@/components/ProductGrid";
import { savedToOffer, useSaved } from "@/lib/saved";
import s from "./home.module.css";

/** «بازدیدهای اخیر» from this device; hidden until there is something to show. */
export default function RecentRail() {
  const { list } = useSaved("history");
  if (!list.length) return null;
  return (
    <section className={s.section}>
      <div className={s.sectionHead}>
        <h2>بازدیدهای اخیر</h2>
        <Link href="/me?tab=history">همه</Link>
      </div>
      <ProductGrid offers={list.slice(0, 10).map(savedToOffer)} layout="rail" />
    </section>
  );
}
