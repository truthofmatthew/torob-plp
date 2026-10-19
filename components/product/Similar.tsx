"use client";

import { useEffect, useState } from "react";
import ProductGrid from "@/components/ProductGrid";
import type { Offer } from "@/lib/types";
import s from "./product.module.css";

export default function Similar({ id }: { id: string }) {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/similar?id=${id}`)
      .then((r) => r.json())
      .then((d: { offers?: Offer[] }) => alive && setOffers(d.offers ?? []))
      .catch(() => alive && setOffers([]));
    return () => {
      alive = false;
    };
  }, [id]);

  if (offers && offers.length === 0) return null;
  return (
    <section className={s.sectionFlush} aria-labelledby="similar-h">
      <h2 id="similar-h" className={`${s.h2} ${s.padded}`}>
        کالاهای مشابه
      </h2>
      <ProductGrid offers={offers ?? []} layout="rail" loading={!offers} />
    </section>
  );
}
