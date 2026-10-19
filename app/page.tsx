import SearchPage from "@/components/SearchPage";

// The challenge brief's query (brake parts for Pride); any ?q= overrides it.
const DEFAULT_QUERY = "لنت ترمز پراید";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return <SearchPage initialQuery={(q ?? DEFAULT_QUERY).slice(0, 120)} />;
}
