import Link from "next/link";
import Shell from "@/components/Shell";
import FlightDetail from "@/components/flights/FlightDetail";
import FlightsHeader from "@/components/flights/FlightsHeader";
import { fetchFlights, parseQuery, sellerBase } from "@/lib/flights/client";
import { searchHref } from "@/lib/flights/format";
import { toJalali } from "@/lib/flights/jalali";
import { normalizeFlights, sellerSearchUrl } from "@/lib/flights/normalize";
import { INTENTS, rankFlights, type Intent } from "@/lib/flights/rank";
import { sampleFlights } from "@/lib/flights/sample";
import p from "@/components/SearchPage.module.css";
import f from "@/components/flights/flights.module.css";

// One flight: every offer side by side (price, refund table, baggage, seats)
// with a link to the seller per row. Reuses the search's 5-minute cache, so
// opening a card right after the results costs no upstream call.

export const dynamic = "force-dynamic";
export const metadata = { title: "جزئیات پرواز · ترب بلیت" };

type SP = Promise<Record<string, string | string[] | undefined>>;

// THR-MHD-2026-10-22-IR3496-0540-Y (see groupId in lib/flights/normalize.ts)
const ID_RE = /^([A-Z]{3})-([A-Z]{3})-(\d{4}-\d{2}-\d{2})-([A-Z0-9]{2})(\d+)-(\d{4})-([YC])$/;

export default async function FlightPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params;
  const raw = await searchParams;
  const m = ID_RE.exec(decodeURIComponent(id));
  const sp = new URLSearchParams(Object.entries(raw).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  const intent = (INTENTS.find((i) => i.id === sp.get("intent"))?.id ?? "best") as Intent;

  if (m) {
    sp.set("from", m[1]);
    sp.set("to", m[2]);
    sp.set("date", toJalali(m[3]));
  }
  const q = m ? parseQuery(sp) : null;
  if (!m || !q) return <Gone />;

  const sellerUrl = sellerSearchUrl(sellerBase(), q.from, q.to, q.gDate, q.party);
  let source: "live" | "cache" | "sample" = "sample";
  let note: string | undefined;
  let groups;
  try {
    const r = await fetchFlights(q);
    groups = normalizeFlights(r.body, { party: q.party, sellerUrl }).groups;
    source = r.source;
  } catch {
    const s = sampleFlights(q.from, q.to, q.party, sellerUrl);
    groups = s.groups;
    note = s.note;
  }

  const query = { from: q.from, to: q.to, date: q.jDate, party: q.party };
  const group = groups.find((g) => g.id === decodeURIComponent(id));
  if (!group) return <Gone back={searchHref(query, { intent })} />;

  // Same ranking as the results, so the featured fare here matches the card.
  const ranked = rankFlights(groups, q.party, intent);
  const mine = ranked.flights.find((f) => f.group.id === group.id) ?? null;

  return (
    <Shell header={{ kind: "custom", node: <FlightsHeader query={query} /> }}>
      {source === "sample" && note && (
        <p className={p.note} role="status">
          {note}
        </p>
      )}
      <FlightDetail group={group} ranked={mine} query={query} intent={intent} />
    </Shell>
  );
}

function Gone({ back }: { back?: string }) {
  return (
    <Shell header={{ kind: "custom", node: <FlightsHeader /> }}>
      <div className={p.state} role="status">
        <p className={p.stateTitle}>این پرواز در نتایج فعلی نیست</p>
        <p className={p.stateText}>ممکن است ظرفیتش پر شده یا پیوند قدیمی باشد.</p>
        <Link className={`${p.retry} ${f.linkButton}`} href={back ?? "/flights"}>
          {back ? "بازگشت به نتایج" : "جست‌وجوی پرواز"}
        </Link>
      </div>
    </Shell>
  );
}
