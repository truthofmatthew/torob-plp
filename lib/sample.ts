import "server-only";
import sample from "@/data/torob-plp-data.json";
import { normalizeSearch } from "./normalize";

// Captured 2026-10-13 from torob.com (mobile, Tabriz). Used whenever the live
// endpoint is unset, errors or times out, so the demo always renders.

type Raw = Record<string, unknown>;
const data = sample as unknown as {
  queries: Record<string, string>;
  plp: Record<string, Raw[]>;
  product_details: Record<string, Raw>;
};

const PAGE_SIZE = 24;

// Words every captured query shares (the car model) don't help pick one.
const STOP = new Set(["پراید", "مناسب", "برای"]);

function pickQueryKey(query: string): string {
  const q = query.trim();
  let best = "disc"; // closest to the brief's brake/clutch parts
  let bestHits = 0;
  for (const [key, text] of Object.entries(data.queries)) {
    const words = text.split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
    const hits = words.filter((w) => q.includes(w)).length;
    if (hits > bestHits) [best, bestHits] = [key, hits];
  }
  return best;
}

export function sampleSearch(query: string, page: number) {
  const key = pickQueryKey(query);
  const all = data.plp[key] ?? [];
  const slice = all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const n = normalizeSearch({ results: slice });
  return {
    ...n,
    total: all.length,
    hasMore: (page + 1) * PAGE_SIZE < all.length,
    sampleQuery: data.queries[key],
  };
}

export function sampleDetails(id: string): Raw | null {
  return data.product_details[id] ?? null;
}

/** The captured PLP item for a product (title, image, price), if any. */
export function sampleCard(id: string): Raw | null {
  for (const items of Object.values(data.plp)) {
    const hit = items.find((i) => i.random_key === id);
    if (hit) return hit;
  }
  return null;
}

/** Captured products other than `id`, as search results (for "similar" offline). */
export function sampleSimilar(id: string) {
  const key = Object.entries(data.plp).find(([, items]) => items.some((i) => i.random_key === id))?.[0] ?? "disc";
  return normalizeSearch({ results: (data.plp[key] ?? []).filter((i) => i.random_key !== id).slice(0, 12) });
}
