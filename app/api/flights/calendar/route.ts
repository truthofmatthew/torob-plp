import { NextRequest, NextResponse } from "next/server";
import { fetchCalendar, parseQuery } from "@/lib/flights/client";
import { addDaysG, toJalali } from "@/lib/flights/jalali";
import { normalizeCalendar } from "@/lib/flights/normalize";
import { sampleCalendar } from "@/lib/flights/sample";
import type { CalendarDay, CalendarResponse } from "@/lib/flights/types";

// GET /api/flights/calendar?from=THR&to=MHD&date=1405-07-30
// Cheapest adult fare per day, the chosen date ±3 days. One upstream call.

const SPAN = 3;

export async function GET(req: NextRequest) {
  const q = parseQuery(req.nextUrl.searchParams);
  if (!q) return NextResponse.json({ error: "bad query" }, { status: 400 });

  // Always return the full ±3 strip; days the source didn't price stay null.
  const window = Array.from({ length: SPAN * 2 + 1 }, (_, i) => toJalali(addDaysG(q.gDate, i - SPAN)));
  const fill = (days: CalendarDay[]) => {
    const by = new Map(days.map((d) => [d.date, d.minPrice]));
    return window.map((date) => ({ date, minPrice: by.get(date) ?? null }));
  };

  try {
    const { body, source } = await fetchCalendar(q.from, q.to, q.gDate, SPAN, SPAN * 2 + 1);
    const res: CalendarResponse = { source, days: fill(normalizeCalendar(body)) };
    return NextResponse.json(res, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.warn("[api/flights/calendar] falling back to sample:", (err as Error).message);
    const res: CalendarResponse = { source: "sample", days: fill(sampleCalendar(q.from, q.to)) };
    return NextResponse.json(res);
  }
}
