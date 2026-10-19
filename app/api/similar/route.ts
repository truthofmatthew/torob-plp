import { NextRequest, NextResponse } from "next/server";
import { normalizeSearch } from "@/lib/normalize";
import { PRK } from "@/lib/product";
import { sampleSimilar } from "@/lib/sample";
import { endpoint, getJson } from "@/lib/torob";

// GET /api/similar?id=<prk> → { offers } shaped like a search page.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!PRK.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  try {
    const url = endpoint("TOROB_SIMILAR_URL");
    url.searchParams.set("prk", id);
    url.searchParams.set("source", "next_mobile");
    url.searchParams.set("limit", "12");
    const { body, source } = await getJson(url);
    const n = normalizeSearch(body as Record<string, unknown>);
    return NextResponse.json(
      { source, offers: n.offers.filter((o) => o.id !== id).slice(0, 12) },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } },
    );
  } catch {
    return NextResponse.json({ source: "sample", offers: sampleSimilar(id).offers });
  }
}
