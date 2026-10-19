"use client";

import { useStoredList } from "../saved";
import type { FlightQuery } from "./types";

// On-device lists for the flight vertical, on lib/saved.ts's guarded store.

export type RecentSearch = FlightQuery & { id: string; at: number };

/** A flight the user asked to watch («خبرم کن»). A snapshot, so the list renders offline. */
export type SavedFlight = {
  id: string; // FlightGroup.id
  title: string; // «ایران ایر ۳۴۹۶ · تهران ← مشهد»
  date: string; // Jalali
  departure: string;
  minPrice: number; // per adult, Toman, when saved
  query: FlightQuery;
  at: number;
};

export const recentId = (q: FlightQuery) =>
  `${q.from}-${q.to}-${q.date}-${q.party.adults}-${q.party.children}-${q.party.infants}`;

export const useRecentSearches = () => useStoredList<RecentSearch>("flights-recent", 8);
export const useSavedFlights = () => useStoredList<SavedFlight>("flights-alerts", 50);
