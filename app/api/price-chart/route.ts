import { NextRequest, NextResponse } from "next/server";
import { PRK } from "@/lib/product";
import { endpoint, getJson } from "@/lib/torob";

// GET /api/price-chart?id=<prk> → { points: [{date, lowest, median}] }
// Torob compresses flat stretches as {stretch:"quiet", until}; we expand them
// into an end point so the line stays flat instead of sloping.

type P = { date: string; lowest: number; median: number };

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!PRK.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  try {
    const url = endpoint("TOROB_PRICE_CHART_URL");
    url.searchParams.set("prk", id);
    url.searchParams.set("v", "2");
    const { body } = await getJson(url);
    const raw = ((body as { points?: unknown[] }).points ?? []) as Record<string, unknown>[];
    const points: P[] = [];
    for (const p of raw) {
      const lowest = Number(p.lowest) || 0;
      const median = Number(p.median) || lowest;
      if (!lowest || typeof p.date !== "string") continue;
      points.push({ date: p.date, lowest, median });
      if (p.stretch === "quiet" && typeof p.until === "string") points.push({ date: p.until, lowest, median });
    }
    return NextResponse.json(
      { points },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" } },
    );
  } catch {
    return NextResponse.json({ points: [] });
  }
}
