import { enDigits } from "./format";
import type { Offer, SellerOffer } from "./types";

// Maps Torob's real response shapes (see SCHEMA.md) to the UI's shapes.
// Everything defensive: a missing field degrades the card, never crashes it.

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? (v as Raw[]) : []);

const TOROB_WEB = "https://torob.com";

/** "در ۱۴ فروشگاه" → 14, "در یدک مای" → 1, "" → 0. */
export function parseStoreCount(shopText: string): { count: number; single: string | null } {
  const t = shopText.trim();
  const m = enDigits(t).match(/(\d+)\s*فروشگاه/);
  if (m) return { count: Number(m[1]), single: null };
  if (t.startsWith("در ")) return { count: 1, single: t.slice(3).trim() || null };
  return { count: 0, single: null };
}

function parseDiscount(info: unknown): number | null {
  const m = enDigits(JSON.stringify(info ?? "")).match(/(\d{1,2})\s*[٪%]/);
  return m ? Number(m[1]) : null;
}

/** One item of search `results[]` → Offer (featured seller comes later). */
export function normalizeSearchItem(r: Raw): Offer | null {
  const id = str(r.random_key);
  const title = str(r.name1).trim();
  if (!id || !title) return null;
  const price = num(r.price);
  const priceText = str(r.price_text);
  const { count, single } = parseStoreCount(str(r.shop_text));
  const path = str(r.web_client_absolute_url);
  return {
    id,
    title,
    imageUrl: str(r.image_url) || null,
    productUrl: path ? TOROB_WEB + path : `${TOROB_WEB}/p/${id}/`,
    minPrice: price,
    storeCount: count,
    singleShopName: single,
    isAd: r.is_adv === true,
    available: price > 0 && !priceText.includes("ناموجود") && str(r.price_text_mode) !== "disabled",
    discountPercent: parseDiscount(r.discount_info),
    featured: null,
  };
}

export function normalizeSearch(raw: Raw) {
  // Torob can list the same product twice on a page (ad slot + organic);
  // keep the first, which is the ad when there is one.
  const seen = new Set<string>();
  const offers = arr(raw.results)
    .map(normalizeSearchItem)
    .filter((o): o is Offer => o !== null && !seen.has(o.id) && !!seen.add(o.id));
  const sortFilter = arr(raw.filters2).find((f) => f.slug === "sort");
  const sortOptions = arr(sortFilter?.items).map((i) => ({ label: str(i.name), value: str(i.value) }));
  const categories = arr(raw.categories)
    .map((c) => ({ id: num(c.cat_id), title: str(c.title) }))
    .filter((c) => c.id && c.title);
  return {
    offers,
    total: num(raw.count),
    hasMore: typeof raw.next === "string" && raw.next.length > 0,
    sortOptions,
    categories,
  };
}

/** One seller from details `products_info.result[]` (live) or the sample's `online[]`. */
export function normalizeOnlineSeller(o: Raw): SellerOffer {
  const guarantee =
    (o.guarantee_info as Raw | undefined)?.status === "enabled" || o.torob_guarantee === "enabled";
  const score = typeof o.shop_score === "number" && o.shop_score > 0 ? o.shop_score : null;
  return {
    shopId: typeof o.shop_id === "number" ? o.shop_id : null,
    shopName: str(o.shop_name).trim(),
    city: str(o.shop_name2).split("،")[0].trim(),
    price: num(o.price),
    isAd: o.is_adv === true,
    available: o.availability !== false,
    priceUnreliable: o.is_price_unreliable === true,
    protectedPurchase: guarantee,
    shopScore: score,
    inPerson: false,
    distance: "",
    offerUrl: str(o.page_url) || null,
  };
}

/** One store from `products_in_store_info.result[]` (live) or the sample's `instore[]`. */
export function normalizeInStoreSeller(o: Raw): SellerOffer {
  return {
    ...normalizeOnlineSeller(o),
    isAd: false,
    protectedPurchase: false,
    inPerson: true,
    distance: str(o.distance),
    offerUrl: null,
  };
}

/** Product details (live or sample) → seller lists. */
export function normalizeDetails(raw: Raw) {
  const liveOnline = arr((raw.products_info as Raw | undefined)?.result);
  const liveStore = arr((raw.products_in_store_info as Raw | undefined)?.result);
  const online = (liveOnline.length ? liveOnline : arr(raw.online)).map(normalizeOnlineSeller);
  const inPerson = (liveStore.length ? liveStore : arr(raw.instore)).map(normalizeInStoreSeller);
  return {
    online: online.filter((s) => s.shopName),
    inPerson: inPerson.filter((s) => s.shopName),
  };
}
