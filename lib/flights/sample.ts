import "server-only";
import sample from "@/data/flights-sample.json";
import { cityOf } from "./airports";
import { jalaliShort, toJalali } from "./jalali";
import { normalizeCalendar, normalizeFlights } from "./normalize";
import type { Party } from "./types";

// Real responses captured by scripts/capture-flights.mjs (THR→MHD, THR→KIH,
// THR→SYZ for one date). Served when the env is unset, the source errors or
// times out, so the demo always renders. The note names the captured date:
// the sample is never presented as the date the user picked.

type Raw = Record<string, unknown>;
const data = sample as unknown as {
  capturedAt: string;
  date: string;
  search: Record<string, { departing: Raw[] }>;
  calendar: Record<string, Raw[]>;
};

export const sampleRoutes = () => Object.keys(data.search);

export function sampleFlights(from: string, to: string, party: Party, sellerUrl: string) {
  const route = data.search[`${from}-${to}`];
  const capturedOn = jalaliShort(toJalali(data.date));
  if (!route) {
    return {
      groups: [],
      offerCount: 0,
      note: `داده‌ی نمونه فقط برای مسیرهای ${sampleRoutes().map((r) => r.split("-").map(cityOf).join("→")).join("، ")} ذخیره شده است.`,
    };
  }
  const n = normalizeFlights({ result: route }, { party, sellerUrl });
  return {
    ...n,
    note: `داده‌ی نمونه: پروازهای ${capturedOn} (ذخیره‌شده). اتصال زنده در دسترس نبود.`,
  };
}

export function sampleCalendar(from: string, to: string) {
  return normalizeCalendar({ result: data.calendar[`${from}-${to}`] ?? [] });
}
