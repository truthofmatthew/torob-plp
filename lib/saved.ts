"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Offer, SavedProduct } from "./types";

// Likes and recently viewed, kept on this device only (no login in the
// prototype). Every read/write is guarded: private mode or blocked storage
// just means an empty list.

export type SavedKind = "likes" | "history";
const KEY: Record<SavedKind, string> = { likes: "torob-plp:likes", history: "torob-plp:history" };
const LIMIT: Record<SavedKind, number> = { likes: 200, history: 40 };
const EMPTY: SavedProduct[] = [];

const listeners = new Set<() => void>();
const cache = new Map<SavedKind, { raw: string | null; list: SavedProduct[] }>();

function read(kind: SavedKind): SavedProduct[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY[kind]);
  } catch {
    return EMPTY;
  }
  const hit = cache.get(kind);
  if (hit && hit.raw === raw) return hit.list;
  let list = EMPTY;
  try {
    const parsed = raw ? (JSON.parse(raw) as SavedProduct[]) : [];
    list = Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    list = EMPTY;
  }
  cache.set(kind, { raw, list });
  return list;
}

function write(kind: SavedKind, list: SavedProduct[]) {
  try {
    window.localStorage.setItem(KEY[kind], JSON.stringify(list.slice(0, LIMIT[kind])));
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
  const list = useSyncExternalStore(
    subscribe,
    () => read(kind),
    () => EMPTY,
  );
  const has = useCallback((id: string) => list.some((p) => p.id === id), [list]);
  const add = useCallback(
    (p: SavedProduct) => write(kind, [p, ...read(kind).filter((x) => x.id !== p.id)]),
    [kind],
  );
  const remove = useCallback((id: string) => write(kind, read(kind).filter((x) => x.id !== id)), [kind]);
  const clear = useCallback(() => write(kind, []), [kind]);
  return { list, has, add, remove, clear };
}
