"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFeaturedSellers } from "@/hooks/useFeaturedSellers";
import { useGoBack } from "@/lib/nav";
import type { Offer, SearchResponse } from "@/lib/types";
import FilterBar from "./FilterBar";
import ProductCard from "./ProductCard";
import Sheet, { SheetOption } from "./Sheet";
import sheetStyles from "./Sheet.module.css";
import TorobBottomNav from "./torob/TorobBottomNav";
import TorobHeader from "./torob/TorobHeader";
import s from "./SearchPage.module.css";

const DEBOUNCE_MS = 300;

// Torob's own sort list (filters2 → sort); used until the first live response.
const DEFAULT_SORTS = [
  { label: "محبوب‌ترین", value: "" },
  { label: "ارزان‌ترین", value: "price" },
  { label: "گران‌ترین", value: "-price" },
  { label: "جدیدترین", value: "-date" },
  { label: "بیشترین فروشنده", value: "-supply" },
];

type Status = "loading" | "ready" | "error";
type Filters = { sort: string; inPerson: boolean; available: boolean; category: number };

export default function SearchPage({
  initialQuery,
  initialCategory = 0,
  categoryTitle,
}: {
  initialQuery: string;
  /** Set on /browse/[id]: results for a category, with or without a query. */
  initialCategory?: number;
  categoryTitle?: string;
}) {
  const goBack = useGoBack();
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<Filters>({
    sort: "",
    inPerson: false,
    available: false,
    category: initialCategory,
  });

  const [offers, setOffers] = useState<Offer[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [meta, setMeta] = useState<Pick<SearchResponse, "source" | "note" | "total" | "categories" | "sortOptions">>({
    source: "live",
    total: 0,
    categories: [],
    sortOptions: [],
  });

  const [sheet, setSheet] = useState<"sort" | "filters" | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const searchAbort = useRef<AbortController | null>(null);
  const reqId = useRef(0);

  // ---- debounce typing → committed query ------------------------------
  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input]);

  // Keep the address shareable, Torob-style: /search?query=…
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    if (query) url.searchParams.set("query", query);
    else url.searchParams.delete("query");
    window.history.replaceState(window.history.state, "", url);
  }, [query]);

  const buildUrl = useCallback(
    (p: number) => {
      const u = new URLSearchParams({ q: query, page: String(p) });
      if (filters.sort) u.set("sort", filters.sort);
      if (filters.inPerson) u.set("inperson", "1");
      if (filters.available) u.set("available", "1");
      if (filters.category) u.set("category", String(filters.category));
      return `/api/search?${u}`;
    },
    [query, filters],
  );

  // ---- first page: cancel stale, keep last good results visible ---------
  const runSearch = useCallback(async () => {
    searchAbort.current?.abort();
    const ac = new AbortController();
    searchAbort.current = ac;
    const id = ++reqId.current;

    if (!query && !filters.category) {
      setOffers([]);
      setHasMore(false);
      setStatus("ready");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch(buildUrl(0), { signal: ac.signal });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as SearchResponse;
      if (id !== reqId.current) return;
      setOffers(data.offers);
      setPage(0);
      setHasMore(data.hasMore);
      setMeta({
        source: data.source,
        note: data.note,
        total: data.total,
        categories: data.categories,
        sortOptions: data.sortOptions,
      });
      setStatus("ready");
      window.scrollTo({ top: 0 });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      if (id === reqId.current) setStatus("error");
    }
  }, [query, filters.category, buildUrl]);

  useEffect(() => {
    void runSearch();
  }, [runSearch]);

  // ---- paging ----------------------------------------------------------
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || status !== "ready") return;
    setLoadingMore(true);
    const id = reqId.current;
    try {
      const res = await fetch(buildUrl(page + 1));
      const data = (await res.json()) as SearchResponse;
      if (id !== reqId.current) return;
      setOffers((prev) => {
        const seen = new Set(prev.map((o) => o.id));
        return [...prev, ...data.offers.filter((o) => !seen.has(o.id))];
      });
      setPage((p) => p + 1);
      setHasMore(data.hasMore && data.offers.length > 0);
    } catch {
      // Keep what we have; the button stays for a manual retry.
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, status, buildUrl, page]);

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((ents) => ents[0].isIntersecting && void loadMore(), {
      rootMargin: "600px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  // ---- seller enrichment for visible cards (≤2 at a time) ---------------
  const { gridRef: grid, featuredFor } = useFeaturedSellers(offers, filters.inPerson);

  // ---- location ---------------------------------------------------------
  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(`/api/city?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const d = (await r.json()) as { name: string | null };
          setCity(d.name ?? "ثبت شد");
        } catch {
          setCity("ثبت شد");
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };

  // ---- render -----------------------------------------------------------
  const sorts = meta.sortOptions.length ? meta.sortOptions : DEFAULT_SORTS;
  const sortLabel = sorts.find((o) => o.value === filters.sort)?.label ?? "محبوب‌ترین";
  const filterCount = (filters.available ? 1 : 0) + (filters.category ? 1 : 0);
  const showSkeleton = status === "loading" && offers.length === 0;

  return (
    <>
      <TorobHeader
        value={input}
        onChange={setInput}
        onSubmit={() => setQuery(input.trim())}
        onBack={initialCategory ? goBack : undefined}
      />

      <main className={s.main}>
        {categoryTitle && (
          <h1 className={s.categoryTitle}>
            {categoryTitle}
            {meta.total > 0 && <span> · {meta.total.toLocaleString("fa-IR")} کالا</span>}
          </h1>
        )}
        <FilterBar
          inPerson={filters.inPerson}
          sortLabel={sortLabel}
          filterCount={filterCount}
          onToggleInPerson={() => setFilters((f) => ({ ...f, inPerson: !f.inPerson }))}
          onOpenSort={() => setSheet("sort")}
          onOpenFilters={() => setSheet("filters")}
          city={city}
          locating={locating}
          onLocate={locate}
        />

        <div className={s.progress} data-on={status === "loading" && offers.length > 0 ? "" : undefined} aria-hidden />

        {meta.source === "sample" && meta.note && status === "ready" && (
          <p className={s.note} role="status">
            {meta.note}: اتصال زنده به ترب در دسترس نبود.
          </p>
        )}

        {status === "error" && offers.length === 0 ? (
          <div className={s.state} role="alert">
            <p className={s.stateTitle}>اتصال برقرار نشد</p>
            <p className={s.stateText}>نتایج بارگیری نشد. دوباره امتحان کنید.</p>
            <button type="button" className={s.retry} onClick={() => void runSearch()}>
              تلاش دوباره
            </button>
          </div>
        ) : status === "ready" && offers.length === 0 ? (
          <div className={s.state} role="status">
            <p className={s.stateTitle}>نتیجه‌ای پیدا نشد</p>
            <p className={s.stateText}>
              {query ? "نام کالا را کوتاه‌تر یا با املای دیگری بنویسید." : "نام کالا یا فروشگاه را بنویسید."}
            </p>
          </div>
        ) : (
          <div
            ref={grid}
            className={s.grid}
            aria-busy={status === "loading"}
            aria-live="polite"
            data-stale={status === "loading" && offers.length > 0 ? "" : undefined}
          >
            {showSkeleton
              ? Array.from({ length: 6 }, (_, i) => <ProductCard key={i} loading />)
              : offers.map((o, i) => (
                  <div key={o.id} data-id={o.id} className={s.cell}>
                    <ProductCard offer={o} featured={featuredFor(o)} position={i} />
                  </div>
                ))}
            {loadingMore && [0, 1].map((i) => <ProductCard key={`more-${i}`} loading />)}
          </div>
        )}

        {hasMore && status === "ready" && offers.length > 0 && (
          <div ref={sentinel} className={s.more}>
            <button type="button" className={s.moreBtn} onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore ? "در حال بارگیری…" : "بیشتر"}
            </button>
          </div>
        )}
      </main>

      <TorobBottomNav />

      <Sheet open={sheet === "sort"} title="مرتب‌سازی" onClose={() => setSheet(null)}>
        {sorts.map((o) => (
          <SheetOption
            key={o.value || "default"}
            selected={filters.sort === o.value}
            onClick={() => {
              setFilters((f) => ({ ...f, sort: o.value }));
              setSheet(null);
            }}
          >
            {o.label}
          </SheetOption>
        ))}
      </Sheet>

      <Sheet open={sheet === "filters"} title="فیلترها" onClose={() => setSheet(null)}>
        <p className={sheetStyles.sectionTitle}>وضعیت</p>
        <SheetOption
          selected={filters.available}
          onClick={() => setFilters((f) => ({ ...f, available: !f.available }))}
        >
          فقط موجودها
        </SheetOption>
        {meta.categories.length > 0 && (
          <>
            <p className={sheetStyles.sectionTitle}>دسته‌بندی</p>
            <SheetOption
              selected={filters.category === 0}
              onClick={() => setFilters((f) => ({ ...f, category: 0 }))}
            >
              همه‌ی دسته‌ها
            </SheetOption>
            {meta.categories.map((c) => (
              <SheetOption
                key={c.id}
                selected={filters.category === c.id}
                onClick={() => setFilters((f) => ({ ...f, category: c.id }))}
              >
                {c.title}
              </SheetOption>
            ))}
          </>
        )}
      </Sheet>
    </>
  );
}
