"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeaturedSeller, Offer, ProductResponse } from "@/lib/types";

const CONCURRENCY = 2;

/**
 * Loads the featured seller for cards as they scroll into view, at most two
 * requests at a time, so a grid never fires one call per card up front.
 * Attach `gridRef` to the element that contains `[data-id]` cells.
 */
export function useFeaturedSellers(offers: Offer[], inPerson = false) {
  const [featured, setFeatured] = useState<Record<string, FeaturedSeller | null>>({});
  const keyOf = useCallback((o: Offer) => `${o.id}|${inPerson ? 1 : 0}`, [inPerson]);
  const queue = useRef<Offer[]>([]);
  const queued = useRef(new Set<string>());
  const active = useRef(0);
  const byId = useMemo(() => new Map(offers.map((o) => [o.id, o])), [offers]);
  const gridRef = useRef<HTMLDivElement>(null);

  const pump = useCallback(() => {
    while (active.current < CONCURRENCY && queue.current.length) {
      const o = queue.current.shift()!;
      const key = keyOf(o);
      active.current++;
      const u = new URLSearchParams({ id: o.id });
      if (o.isAd) u.set("ad", "1");
      if (inPerson) u.set("inperson", "1");
      fetch(`/api/product?${u}`)
        .then((r) => (r.ok ? (r.json() as Promise<ProductResponse>) : null))
        .then((d) => setFeatured((f) => ({ ...f, [key]: d?.featured ?? null })))
        .catch(() => setFeatured((f) => ({ ...f, [key]: null })))
        .finally(() => {
          active.current--;
          pump();
        });
    }
  }, [keyOf, inPerson]);

  useEffect(() => {
    queue.current = [];
    queued.current.clear();
  }, [inPerson]);

  useEffect(() => {
    const root = gridRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (ents) => {
        for (const e of ents) {
          if (!e.isIntersecting) continue;
          const o = byId.get((e.target as HTMLElement).dataset.id ?? "");
          if (!o || !o.available) continue;
          const key = keyOf(o);
          if (queued.current.has(key)) continue;
          queued.current.add(key);
          queue.current.push(o);
        }
        pump();
      },
      { rootMargin: "200px" },
    );
    root.querySelectorAll<HTMLElement>("[data-id]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [byId, keyOf, pump]);

  const featuredFor = useCallback((o: Offer) => featured[keyOf(o)], [featured, keyOf]);
  return { gridRef, featuredFor };
}
