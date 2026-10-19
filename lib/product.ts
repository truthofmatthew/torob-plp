import "server-only";
import { normalizeProduct } from "./normalize";
import { pickFeatured } from "./recommend";
import { sampleCard, sampleDetails } from "./sample";
import { endpoint, getJson } from "./torob";
import type { ProductPage } from "./types";

export const PRK = /^[0-9a-f-]{36}$/i;

/** Product page data: live details → normalized, with the featured-seller rule applied. */
export async function getProductPage(id: string, preferInPerson = false): Promise<ProductPage | null> {
  if (!PRK.test(id)) return null;
  let raw: Record<string, unknown> | null = null;
  let source: ProductPage["source"] = "live";
  try {
    const url = endpoint("TOROB_DETAILS_URL");
    url.searchParams.set("prk", id);
    url.searchParams.set("source", "next_mobile");
    const r = await getJson(url);
    raw = r.body as Record<string, unknown>;
    source = r.source;
  } catch {
    raw = sampleDetails(id);
    source = "sample";
  }
  const card = source === "sample" ? sampleCard(id) : null;
  if (!raw && !card) return null;

  const page = normalizeProduct(raw ?? {}, id, card);
  if (!page.title) return null;
  const featured = pickFeatured({
    online: page.online,
    inPerson: page.inPerson,
    productIsAd: false,
    preferInPerson,
  });
  return { ...page, featured, source };
}
