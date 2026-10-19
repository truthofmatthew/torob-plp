import SearchPage from "@/components/SearchPage";

// Torob's results URL shape: /search?query=…  (q= still accepted).
const DEFAULT_QUERY = "لنت ترمز پراید";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ query?: string; q?: string }> }) {
  const { query, q } = await searchParams;
  return { title: `قیمت ${query ?? q ?? DEFAULT_QUERY} · ترب (نمونه)` };
}

export default async function Search({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; q?: string }>;
}) {
  const { query, q } = await searchParams;
  return <SearchPage initialQuery={(query ?? q ?? DEFAULT_QUERY).slice(0, 120)} />;
}
