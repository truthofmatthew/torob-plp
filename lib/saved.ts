"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Offer, SavedProduct } from "./types";

// Likes, alerts and recently viewed, kept on this device only (no login in the
// prototype). Every read/write is guarded: private mode or blocked storage
// just means an empty list.

/** likes = «پسندیده‌ها», alerts = «خبرم کن» (price/stock watch), history = recently viewed. */
export type SavedKind = "likes" | "alerts" | "history";
const KEY: Record<SavedKind, string> = {
  likes: "torob-plp:likes",
  alerts: "torob-plp:alerts",
  history: "torob-plp:history",
};
const LIMIT: Record<SavedKind, number> = { likes: 200, alerts: 200, history: 40 };

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; list: unknown[] }>();
const EMPTY: never[] = [];

function read<T>(key: string): T[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return EMPTY;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.list as T[];
  let list: T[] = EMPTY;
  try {
    const parsed = raw ? (JSON.parse(raw) as T[]) : [];
    list = Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    list = EMPTY;
  }
  cache.set(key, { raw, list });
  return list;
}

function write<T>(key: string, list: T[], limit: number) {
  try {
    window.localStorage.setItem(key, JSON.stringify(list.slice(0, limit)));
  } catch {
    // storage full or blocked; the UI keeps working without persistence
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key?.startsWith("torob-plp:") && l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * A list of `{ id }` items in localStorage under `torob-plp:<name>`, newest
 * first, capped at `limit`. Shared by product likes/alerts/history and the
 * flight vertical's recent searches and saved flights.
 */
export function useStoredList<T extends { id: string }>(name: string, limit: number) {
  const key = `torob-plp:${name}`;
  const list = useSyncExternalStore(
    subscribe,
    () => read<T>(key),
    () => EMPTY as T[],
  );
  const has = useCallback((id: string) => list.some((p) => p.id === id), [list]);
  const add = useCallback(
    (p: T) => write(key, [p, ...read<T>(key).filter((x) => x.id !== p.id)], limit),
    [key, limit],
  );
  const remove = useCallback((id: string) => write(key, read<T>(key).filter((x) => x.id !== id), limit), [key, limit]);
  const clear = useCallback(() => write(key, [], limit), [key, limit]);
  return { list, has, add, remove, clear };
}

export function toSaved(o: Pick<Offer, "id" | "title" | "imageUrl" | "minPrice" | "storeCount" | "available">): SavedProduct {
  return {
    id: o.id,
    title: o.title,
    imageUrl: o.imageUrl,
    minPrice: o.minPrice,
    storeCount: o.storeCount,
    available: o.available,
    savedAt: Date.now(),
  };
}

export function savedToOffer(s: SavedProduct): Offer {
  return {
    id: s.id,
    title: s.title,
    imageUrl: s.imageUrl,
    productUrl: `/p/${s.id}`,
    minPrice: s.minPrice,
    storeCount: s.storeCount,
    singleShopName: null,
    isAd: false,
    available: s.available,
    discountPercent: null,
    featured: null,
  };
}

export function useSaved(kind: SavedKind) {
  return useStoredList<SavedProduct>(KEY[kind].slice("torob-plp:".length), LIMIT[kind]);
}
