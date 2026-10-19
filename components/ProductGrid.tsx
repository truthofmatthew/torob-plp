"use client";

import { useFeaturedSellers } from "@/hooks/useFeaturedSellers";
import type { Offer } from "@/lib/types";
import ProductCard from "./ProductCard";
import s from "./ProductGrid.module.css";

// The PLP grid (2 columns, gap 8, margin 12) or a horizontal rail of the same
// cards, with lazy featured-seller loading. Used on product, offers and «ترب من».
export default function ProductGrid({
  offers,
  layout = "grid",
  loading = false,
}: {
  offers: Offer[];
  layout?: "grid" | "rail";
  loading?: boolean;
}) {
  const { gridRef, featuredFor } = useFeaturedSellers(offers);
  return (
    <div ref={gridRef} className={layout === "rail" ? s.rail : s.grid}>
      {loading
        ? Array.from({ length: layout === "rail" ? 3 : 4 }, (_, i) => (
            <div key={i} className={s.cell}>
              <ProductCard loading />
            </div>
          ))
        : offers.map((o, i) => (
            <div key={o.id} data-id={o.id} className={s.cell}>
              <ProductCard offer={o} featured={featuredFor(o)} position={i} />
            </div>
          ))}
    </div>
  );
}
