import { NextRequest, NextResponse } from "next/server";
import { getJson } from "@/lib/torob";

// GET /api/city?lat=&lon= → { id, name } via Torob's reverse geocoder.
// Coordinates are rounded to ~1 km before leaving the server; nothing is stored
// beyond the 5-minute response cache.

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  const base = process.env.TOROB_CITY_REVERSE_URL;
  if (!base || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ id: null, name: null });
  }
  try {
    const url = new URL(base);
    url.searchParams.set("lat", lat.toFixed(2));
    url.searchParams.set("lon", lon.toFixed(2));
    const { body } = await getJson(url);
    const b = body as { id?: number; name?: string };
    return NextResponse.json({ id: b.id ?? null, name: b.name ?? null });
  } catch {
    return NextResponse.json({ id: null, name: null });
  }
}
