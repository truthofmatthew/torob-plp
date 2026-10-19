import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import FlightResults from "@/components/flights/FlightResults";
import FlightsHeader from "@/components/flights/FlightsHeader";
import { cityOf } from "@/lib/flights/airports";
import { parseQuery } from "@/lib/flights/client";
import { INTENTS, type Intent } from "@/lib/flights/rank";

type SP = Promise<Record<string, string | string[] | undefined>>;

// Results render on the client (the source is slow and intent switching is
// local), so nothing upstream is fetched here at build or request time.
export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";
  return { title: `بلیت ${cityOf(from)} به ${cityOf(to)} · ترب بلیت` };
}

export default async function FlightSearch({ searchParams }: { searchParams: SP }) {
  const raw = await searchParams;
  const sp = new URLSearchParams(Object.entries(raw).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  const q = parseQuery(sp);
  if (!q) redirect(`/flights?${sp}`);
  const intent = (INTENTS.find((i) => i.id === sp.get("intent"))?.id ?? "best") as Intent;
  const bag = Math.min(Math.max(Number(sp.get("bag")) || 0, 0), 40);
  const query = { from: q.from, to: q.to, date: q.jDate, party: q.party };

  return (
    <Shell header={{ kind: "custom", node: <FlightsHeader query={query} /> }}>
      <FlightResults query={query} intent={intent} bag={bag} />
    </Shell>
  );
}
