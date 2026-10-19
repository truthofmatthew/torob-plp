// Shapes the UI depends on. Nothing here mirrors Torob's field names, so an
// endpoint change only touches lib/normalize.ts.

/** One seller's offer for a product (online or in-person). */
export type SellerOffer = {
  shopId: number | null;
  shopName: string;
  city: string;
  price: number; // Toman, 0 when unknown
  isAd: boolean;
  available: boolean;
  priceUnreliable: boolean;
  /** Torob's purchase protection ("خرید با ضمانت ترب"). Never an authenticity claim. */
  protectedPurchase: boolean;
  /** 0..5 from Torob, null when the shop has no score. */
  shopScore: number | null;
  inPerson: boolean;
  /** In-store only: Torob's distance text, empty until the user sets a location. */
  distance: string;
  /** Torob's redirect to this seller's offer, when available. */
  offerUrl: string | null;
  /** Seller's own listing title, e.g. «لنت جلو پراید سبز پارس PL21355M». */
  offerTitle: string;
  /** Torob's own score line, verbatim (e.g. «★۵ (۴ سال در ترب)»). Never computed by us. */
  scoreText: string;
  /** e.g. «۱۵ روز پیش». */
  lastChange: string;
  /** Delivery/payment notes Torob provides (pay on delivery, same-day). */
  notes: string[];
  /** In-store only: «باز · تا ۱۹:۰۰» style text and address. */
  hours: string;
  address: string;
  buttonText: string;
};

export type SpecGroup = { title: string; rows: { key: string; value: string }[] };

/** Everything the product page renders. */
export type ProductPage = {
  source: "live" | "cache" | "sample";
  id: string;
  title: string;
  subtitle: string;
  images: string[];
  breadcrumbs: { title: string; catId: number }[];
  minPrice: number;
  maxPrice: number;
  available: boolean;
  online: SellerOffer[];
  inPerson: SellerOffer[];
  onlineCount: number;
  inPersonCount: number;
  featured: FeaturedSeller | null;
  keySpecs: { key: string; value: string }[];
  specs: SpecGroup[];
  torobUrl: string;
};

/** Minimal snapshot kept on-device for likes and history. */
export type SavedProduct = Pick<
  Offer,
  "id" | "title" | "imageUrl" | "minPrice" | "storeCount" | "available"
> & { savedAt: number };

export type CardState =
  | "recommended" // پیشنهاد
  | "cheapest" // ارزان‌ترین
  | "single" // تک‌فروشنده
  | "inperson" // حضوری
  | "unavailable" // ناموجود
  | "loading"; // بارگذاری

/** What ProductCard renders. */
export type Offer = {
  id: string; // Torob's random_key (prk)
  title: string;
  imageUrl: string | null;
  productUrl: string; // torob.com product page
  /** Lowest price across stores, the card's main price. */
  minPrice: number;
  storeCount: number; // 1 = single seller
  /** Name parsed from "در {shop}" when there is exactly one seller. */
  singleShopName: string | null;
  isAd: boolean;
  available: boolean;
  discountPercent: number | null;
  /** Filled after /api/product returns; null until then. */
  featured: FeaturedSeller | null;
};

export type FeaturedSeller = {
  seller: SellerOffer;
  /** Which label the card shows for this seller. */
  reason: "recommended" | "cheapest" | "single" | "inperson";
};

export type SearchResponse = {
  source: "live" | "cache" | "sample";
  query: string;
  page: number;
  total: number;
  hasMore: boolean;
  offers: Offer[];
  sortOptions: { label: string; value: string }[];
  categories: { id: number; title: string }[];
  note?: string;
};

export type ProductResponse = {
  source: "live" | "cache" | "sample";
  id: string;
  online: SellerOffer[];
  inPerson: SellerOffer[];
  featured: FeaturedSeller | null;
};
