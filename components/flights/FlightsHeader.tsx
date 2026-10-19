"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import TorobHeader from "@/components/torob/TorobHeader";
import { useGoBack } from "@/lib/nav";
import { searchHref } from "@/lib/flights/format";
import { parseFlightQuery } from "@/lib/flights/parse";
import type { FlightQuery } from "@/lib/flights/types";

/**
 * Torob's search header, unchanged, on the flight pages. Typing a sentence
 * («شیراز جمعه عصر ۲ نفر») re-searches flights; anything the sentence doesn't
 * say keeps the current value. Text with no flight words goes to product search.
 */
export default function FlightsHeader({ query }: { query?: FlightQuery }) {
  const router = useRouter();
  const goBack = useGoBack();
  const [value, setValue] = useState("");
  return (
    <TorobHeader
      value={value}
      onChange={setValue}
      onBack={goBack}
      onSubmit={() => {
        const text = value.trim();
        if (!text) return;
        const p = parseFlightQuery(text);
        if (!p.tokens.length) {
          router.push(`/search?query=${encodeURIComponent(text)}`);
          return;
        }
        const base: FlightQuery = query ?? { from: "THR", to: "", date: "", party: { adults: 1, children: 0, infants: 0 } };
        const next: FlightQuery = {
          from: p.from ?? base.from,
          to: p.to ?? base.to,
          date: p.date ?? base.date,
          party: p.party ?? base.party,
        };
        if (!next.to || !next.date || next.from === next.to) {
          const sp = new URLSearchParams({ from: next.from, to: next.to, date: next.date, adults: String(next.party.adults) });
          router.push(`/flights?${sp}`);
          return;
        }
        setValue("");
        router.push(searchHref(next, { intent: p.intent, bag: p.minBaggageKg }));
      }}
    />
  );
}
