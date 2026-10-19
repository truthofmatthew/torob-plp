import { NextRequest, NextResponse } from "next/server";
import { fetchFlights, parseQuery, sellerBase } from "@/lib/flights/client";
import { normalizeFlights, sellerSearchUrl } from "@/lib/flights/normalize";
import { sampleFlights } from "@/lib/flights/sample";
import type { FlightSearchResponse } from "@/lib/flights/types";

// GET /api/flights/search?from=THR&to=MHD&date=1405-07-30&adults=2&children=1&infants=0
// Validate → source (server-side only) → normalize + merge → JSON. Ranking is a
// pure function the client runs per intent chip, so switching intent costs no call.

export async function GET(req: NextRequest) {
  const q = parseQuery(req.nextUrl.searchParams);
  if (!q) return NextResponse.json({ error: "bad query" }, { status: 400 });

  const query = { from: q.from, to: q.to, date: q.jDate, party: q.party };
  const sellerUrl = sellerSearchUrl(sellerBase(), q.from, q.to, q.gDate, q.party);

  try {
    const { body, source } = await fetchFlights(q);
    const n = normalizeFlights(body, { party: q.party, sellerUrl });
    const res: FlightSearchResponse = { source, query, ...n };
    return NextResponse.json(res, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.warn("[api/flights/search] falling back to sample:", (err as Error).message);
    const s = sampleFlights(q.from, q.to, q.party, sellerUrl);
    const res: FlightSearchResponse = { source: "sample", query, groups: s.groups, offerCount: s.offerCount, note: s.note };
    return NextResponse.json(res);
  }
}
