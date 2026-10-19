import { NextRequest, NextResponse } from "next/server";
import { normalizeSearch } from "@/lib/normalize";
import { sampleSearch } from "@/lib/sample";
import { endpoint, getJson } from "@/lib/torob";
import type { SearchResponse } from "@/lib/types";

// GET /api/search?q=&page=&sort=&inperson=1&available=1&category=
// Server-side only: the browser never sees the upstream URL or headers.

const ALLOWED_SORTS = new Set(["", "price", "-price", "-date", "-supply"]);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, 120);
  const page = Math.min(Math.max(Number(sp.get("page")) || 0, 0), 40);
  const sort = ALLOWED_SORTS.has(sp.get("sort") ?? "") ? (sp.get("sort") ?? "") : "";
  const inPerson = sp.get("inperson") === "1";
  const onlyAvailable = sp.get("available") === "1";
  const category = Number(sp.get("category")) || 0;

  if (!q && !category) {
    const empty: SearchResponse = {
      source: "live", query: q, page, total: 0, hasMore: false,
      offers: [], sortOptions: [], categories: [],
    };
    return NextResponse.json(empty);
  }

  try {
    const url = endpoint("TOROB_SEARCH_URL");
    if (q) url.searchParams.set("q", q);
    url.searchParams.set("page", String(page));
    url.searchParams.set("size", "24");
    url.searchParams.set("sort", sort || "popularity");
    url.searchParams.set("source", "next_mobile");
    if (inPerson) url.searchParams.set("shop_type", "offline");
    if (onlyAvailable) url.searchParams.set("available", "true");
    if (category) url.searchParams.set("category", String(category));

    const { body, source } = await getJson(url);
    const n = normalizeSearch(body as Record<string, unknown>);
    const res: SearchResponse = { source, query: q, page, ...n };
    return NextResponse.json(res, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (err) {
    const s = sampleSearch(q, page);
    const res: SearchResponse = {
      source: "sample",
      query: q,
      page,
      total: s.total,
      hasMore: s.hasMore,
      offers: s.offers,
      sortOptions: [],
      categories: [],
      note: `داده‌ی نمونه (ذخیره‌شده) · «${s.sampleQuery}»`,
    };
    console.warn("[api/search] falling back to sample:", (err as Error).message);
    return NextResponse.json(res);
  }
}
