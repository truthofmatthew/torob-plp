import type { FeaturedSeller, SellerOffer } from "./types";

/**
 * Which seller a product card features, and with which label.
 *
 * Pure and deterministic: same sellers in, same pick out. It only reads the
 * SellerOffer shape, so an endpoint change never touches this file.
 *
 * Rules, in order:
 * 1. In-person mode ("خرید حضوری" chip on) with at least one priced in-store
 *    seller → the cheapest in-store seller, label "حضوری".
 * 2. Exactly one usable online seller → that seller, label "فروشنده".
 * 3. "Recommended" ("خرید با ضمانت ترب") → the best-scoring seller that
 *    - is not an ad (an ad is never a recommendation),
 *    - offers Torob purchase protection,
 *    - has a reliable, in-stock price,
 *    - costs at most PRICE_CEILING × the lowest usable price.
 *    The product card itself must not be an ad slot either.
 * 4. Otherwise → the cheapest usable seller, label "ارزان‌ترین", preferring
 *    non-ads.
 *
 * The score is transparent: price closeness to the lowest price dominates,
 * and the shop's own Torob score breaks near-ties. No invented ratings: a shop
 * with no score gets the neutral midpoint, never a bonus.
 */
export const WEIGHTS = { price: 0.7, shopScore: 0.3 } as const;
export const PRICE_CEILING = 1.15; // recommended may cost ≤ 15% above the lowest
const NEUTRAL_SCORE = 2.5; // out of 5, for shops without a score

export type RecommendInput = {
  online: SellerOffer[];
  inPerson: SellerOffer[];
  productIsAd: boolean;
  preferInPerson: boolean;
};

const usable = (s: SellerOffer) => s.available && !s.priceUnreliable && s.price > 0;

export function scoreSeller(s: SellerOffer, lowestPrice: number): number {
  const priceTerm = lowestPrice / s.price; // 1.0 for the cheapest seller
  const shopTerm = (s.shopScore ?? NEUTRAL_SCORE) / 5;
  return WEIGHTS.price * priceTerm + WEIGHTS.shopScore * shopTerm;
}

const byPriceThenName = (a: SellerOffer, b: SellerOffer) =>
  a.price - b.price || a.shopName.localeCompare(b.shopName, "fa");

export function pickFeatured(input: RecommendInput): FeaturedSeller | null {
  const { online, inPerson, productIsAd, preferInPerson } = input;

  if (preferInPerson) {
    const stores = inPerson.filter(usable).sort(byPriceThenName);
    if (stores.length) return { seller: stores[0], reason: "inperson" };
  }

  const candidates = online.filter(usable);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return { seller: candidates[0], reason: "single" };

  const lowest = Math.min(...candidates.map((s) => s.price));

  if (!productIsAd) {
    const eligible = candidates.filter(
      (s) => !s.isAd && s.protectedPurchase && s.price <= lowest * PRICE_CEILING,
    );
    if (eligible.length) {
      const best = [...eligible].sort(
        (a, b) => scoreSeller(b, lowest) - scoreSeller(a, lowest) || byPriceThenName(a, b),
      )[0];
      return { seller: best, reason: "recommended" };
    }
  }

  const nonAds = candidates.filter((s) => !s.isAd).sort(byPriceThenName);
  const cheapest = nonAds[0] ?? [...candidates].sort(byPriceThenName)[0];
  return { seller: cheapest, reason: "cheapest" };
}
