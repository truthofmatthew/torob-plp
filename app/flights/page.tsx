import Shell from "@/components/Shell";
import FlightSearchForm, { RecentSearches } from "@/components/flights/FlightSearchForm";
import SavedFlights from "@/components/flights/SavedFlights";
import { isAirport } from "@/lib/flights/airports";
import { fromJalali } from "@/lib/flights/jalali";
import type { FlightQuery } from "@/lib/flights/types";
import s from "@/components/flights/flights.module.css";

export const metadata = { title: "ترب بلیت · مقایسه‌ی بلیت هواپیما (نمونه)" };

type SP = Promise<Record<string, string | string[] | undefined>>;

// «ترب بلیت» home: one-sentence search or the form, then recent searches and
// watched flights from this device. Prefilled from the URL when coming back
// from results («تغییر»).
export default async function FlightsHome({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const n = (k: string, d: number) => (Number.isFinite(Number(one(k))) && one(k) !== "" ? Number(one(k)) : d);
  const initial: Partial<FlightQuery> = {};
  if (isAirport(one("from"))) initial.from = one("from");
  if (isAirport(one("to"))) initial.to = one("to");
  if (fromJalali(one("date"))) initial.date = one("date");
  if (one("adults")) initial.party = { adults: Math.max(1, n("adults", 1)), children: n("children", 0), infants: n("infants", 0) };

  return (
    <Shell header={{ kind: "title", title: "ترب بلیت", backHref: "/" }}>
      <section className={s.hero}>
        <p className={s.heroTitle}>بلیت هواپیما، همه‌ی پیشنهادها یک‌جا</p>
        <p className={s.heroSub}>هر پرواز یک کارت؛ قیمت، قوانین استرداد و بار همه‌ی پیشنهادهایش کنار هم.</p>
        <FlightSearchForm initial={initial} />
      </section>
      <RecentSearches />
      <SavedFlights />
    </Shell>
  );
}
