import { enDigits } from "./format";
import type { Offer, ProductPage, SellerOffer, SpecGroup } from "./types";

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
  return {
    id,
    title,
    imageUrl: str(r.image_url) || null,
    productUrl: `/p/${id}`,
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
    offerTitle: str(o.name1).trim(),
    scoreText: str((o.score_info as Raw | undefined)?.score_text) || str(o.score_text),
    lastChange: str(o.last_price_change_date),
    notes: [
      str((o.more_info as Raw | undefined)?.payment_on_delivery) || str(o.pay_on_delivery),
      str((o.more_info as Raw | undefined)?.same_day_delivery) || str(o.same_day),
    ].filter(Boolean),
    hours: "",
    address: "",
    buttonText: str(o.button_text) || "خرید اینترنتی",
  };
}

/** One store from `products_in_store_info.result[]` (live) or the sample's `instore[]`. */
export function normalizeInStoreSeller(o: Raw): SellerOffer {
  const h = ((o.working_hours as Raw | undefined)?.title ?? o.hours) as Raw | undefined;
  const hours = [str(h?.status), str(h?.text)].filter(Boolean).join(" · ");
  const scoreText = str((o.score_info as Raw | undefined)?.score_text) || str(o.score_text);
  return {
    ...normalizeOnlineSeller(o),
    isAd: false,
    protectedPurchase: false,
    inPerson: true,
    distance: str(o.distance),
    // Torob's contact-info link for the store.
    offerUrl: str(o.page_url) || null,
    // In-store rows label every shop «خرید حضوری» there; that isn't a score.
    scoreText: scoreText === "خرید حضوری" ? "" : scoreText,
    notes: [],
    hours,
    address: str(o.address) || str(o.name1),
    offerTitle: "",
    buttonText: str(o.button_text) || "اطلاعات تماس",
  };
}

const TOROB_IMG = /^https:\/\/image\.torob\.com\//;

/** Product details (live) or sample entry (+ its PLP card) → ProductPage, minus `featured`/`source`. */
export function normalizeProduct(
  raw: Raw,
  id: string,
  card?: Raw | null,
): Omit<ProductPage, "featured" | "source"> {
  const { online, inPerson } = normalizeDetails(raw);

  const media = arr(raw.media_urls).map((m) => str(m.url));
  const imageUrls = arr(raw.image_urls).flatMap((g) =>
    Array.isArray(g.urls) ? (g.urls as unknown[]).map(str) : [],
  );
  const images = [...new Set([...media, ...imageUrls, str(raw.image_url), str(card?.image_url)])].filter(
    (u) => TOROB_IMG.test(u),
  );

  const breadcrumbs = arr(raw.breadcrumbs)
    .map((b) => ({ title: str(b.title), catId: num(b.cat_id) || num(b.id) }))
    .filter((b) => b.title && b.catId);

  const keySpecs = arr(raw.key_specs).flatMap((g) =>
    arr(g.items).map((i) => ({
      key: str(i.key),
      value: Array.isArray(i.value) ? (i.value as unknown[]).map(str).join("، ") : str(i.value),
    })),
  );
  const specs: SpecGroup[] = arr((raw.structural_specs as Raw | undefined)?.headers)
    .map((h) => ({
      title: str(h.header),
      rows: Object.entries((h.specs as Record<string, unknown>) ?? {}).map(([key, v]) => ({
        key,
        value: Array.isArray(v) ? v.map(String).join("، ") : String(v ?? ""),
      })),
    }))
    .filter((g) => g.rows.length);

  const prices = online.filter((s) => s.available && s.price > 0).map((s) => s.price);
  const minPrice = num(raw.min_price) || num(raw.min) || (prices.length ? Math.min(...prices) : num(card?.price));
  const maxPrice = num(raw.max_price) || num(raw.max) || (prices.length ? Math.max(...prices) : minPrice);
  const path = str(raw.web_client_absolute_url) || str(card?.web_client_absolute_url);

  return {
    id,
    title: str(raw.name1).trim() || str(card?.name1).trim(),
    subtitle: /[a-z]-[a-z]/.test(str(raw.name2)) ? "" : str(raw.name2).trim(),
    images,
    breadcrumbs,
    minPrice,
    maxPrice,
    available: raw.availability !== false && minPrice > 0,
    online,
    inPerson,
    onlineCount: num((raw.products_info as Raw | undefined)?.count) || num(raw.online_count) || online.length,
    inPersonCount:
      num((raw.products_in_store_info as Raw | undefined)?.count) || num(raw.instore_count) || inPerson.length,
    keySpecs,
    specs,
    torobUrl: path ? TOROB_WEB + path : `${TOROB_WEB}/p/${id}/`,
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
