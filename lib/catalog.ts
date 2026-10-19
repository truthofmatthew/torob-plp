import "server-only";
import { normalizeSearchItem } from "./normalize";
import { sampleSearch } from "./sample";
import { endpoint, getJson } from "./torob";
import type { Offer } from "./types";

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? (v as Raw[]) : []);
const STORAGE = /^https:\/\/storage\d*\.torob\.com\//;

/** Torob rows can repeat a product; keep the first of each id. */
function uniqueOffers(list: (Offer | null)[]): Offer[] {
  const seen = new Set<string>();
  return list.filter((o): o is Offer => o !== null && !seen.has(o.id) && !!seen.add(o.id));
}

export type Category = {
  id: number;
  title: string;
  icon: string | null;
  image: string | null;
  hasChildren: boolean;
};

export type CategoryNode = { self: Category & { parentId: number | null }; children: Category[] };

function toCategory(c: Raw): Category {
  const icon = str(c.icon);
  const image = str(c.image);
  return {
    id: Number(c.id) || 0,
    title: str(c.title),
    icon: STORAGE.test(icon) ? icon : null,
    image: STORAGE.test(image) ? image : null,
    hasChildren: c.has_children === true,
  };
}

/** Category + its children (id 0 = root). Null when Torob is unreachable. */
export async function getCategory(id: number): Promise<CategoryNode | null> {
  try {
    const url = endpoint("TOROB_CATEGORY_URL");
    url.searchParams.set("catid", String(id));
    url.searchParams.set("source", "next_mobile");
    const { body } = await getJson(url);
    const b = body as Raw;
    const self = (b.category ?? {}) as Raw;
    return {
      self: { ...toCategory(self), parentId: typeof self.category_parent === "number" ? self.category_parent : null },
      children: arr(b.children)
        .filter((c) => c.status === undefined || c.status === "active")
        .map(toCategory)
        .filter((c) => c.title),
    };
  } catch {
    return null;
  }
}

export type OfferRow = { title: string; subtitle: string; categoryId: number | null; offers: Offer[] };

/** Torob's «پیشنهاد ویژه» rows that carry products (banner rows are skipped). */
export async function getSpecialOffers(page = 0): Promise<{ rows: OfferRow[]; hasMore: boolean; sample: boolean }> {
  try {
    const url = endpoint("TOROB_OFFERS_URL");
    url.searchParams.set("source", "next_mobile");
    if (page) url.searchParams.set("page", String(page));
    const { body } = await getJson(url);
    const b = body as Raw;
    const rows = arr(b.results)
      .map((r) => {
        const head = arr(r.data)[0] ?? {};
        const api = str(head.api_url);
        const cat = api.match(/cat_ids=(\d+)/)?.[1];
        return {
          title: str(head.title).replace(/^\p{Extended_Pictographic}️?/u, "").trim(),
          subtitle: str(head.description),
          categoryId: cat ? Number(cat) : null,
          offers: uniqueOffers(arr(r.base_products).map(normalizeSearchItem)),
        };
      })
      .filter((r) => r.title && r.offers.length >= 2);
    return { rows, hasMore: typeof b.next === "string" && !!b.next, sample: false };
  } catch {
    const s = sampleSearch("دیسک و صفحه", 0);
    return {
      rows: [{ title: "قطعات پراید", subtitle: "داده‌ی نمونه", categoryId: null, offers: s.offers.slice(0, 12) }],
      hasMore: false,
      sample: true,
    };
  }
}

export type Trend = { query: string; categoryId: number | null; offer: Offer | null };

/** Torob's trending searches, each with one example product. */
export async function getTrends(): Promise<Trend[]> {
  try {
    const url = endpoint("TOROB_TRENDS_URL");
    url.searchParams.set("source", "next_mobile");
    const { body } = await getJson(url);
    return arr(body)
      .map((t) => ({
        query: str(t.query).trim(),
        categoryId: typeof t.category_id === "number" ? t.category_id : null,
        offer: t.partial_info ? normalizeSearchItem(t.partial_info as Raw) : null,
      }))
      .filter((t, i, all) => t.query && all.findIndex((x) => x.query === t.query) === i)
      .slice(0, 20);
  } catch {
    return [];
  }
}
