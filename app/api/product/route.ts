import { NextRequest, NextResponse } from "next/server";
import { normalizeDetails } from "@/lib/normalize";
import { pickFeatured } from "@/lib/recommend";
import { sampleDetails } from "@/lib/sample";
import { endpoint, getJson } from "@/lib/torob";
import type { ProductResponse } from "@/lib/types";

// GET /api/product?id=<prk>&ad=1&inperson=1
// Fetches one product's sellers and runs the featured-seller rule server-side.

const PRK = /^[0-9a-f-]{36}$/i;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const id = sp.get("id") ?? "";
  if (!PRK.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const productIsAd = sp.get("ad") === "1";
  const preferInPerson = sp.get("inperson") === "1";

  let raw: Record<string, unknown> | null = null;
  let source: ProductResponse["source"] = "live";
  try {
    const url = endpoint("TOROB_DETAILS_URL");
    url.searchParams.set("prk", id);
    url.searchParams.set("source", "next_mobile");
    const r = await getJson(url);
    raw = r.body as Record<string, unknown>;
    source = r.source;
  } catch (err) {
    raw = sampleDetails(id);
    source = "sample";
    if (!raw) {
      console.warn("[api/product] upstream failed, no sample for", id, (err as Error).message);
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
  }

  const { online, inPerson } = normalizeDetails(raw);
  const featured = pickFeatured({ online, inPerson, productIsAd, preferInPerson });
  const res: ProductResponse = { source, id, online, inPerson, featured };
  return NextResponse.json(res, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
