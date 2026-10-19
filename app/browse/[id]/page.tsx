import { notFound } from "next/navigation";
import SearchPage from "@/components/SearchPage";
import { getCategory } from "@/lib/catalog";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ query?: string }> };

export async function generateMetadata({ params }: Props) {
  const node = await getCategory(Number((await params).id));
  return { title: node ? `قیمت ${node.self.title} · ترب (نمونه)` : "دسته‌بندی" };
}

// A category's products: the same PLP as search, preset to this category.
export default async function Browse({ params, searchParams }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [{ query }, node] = await Promise.all([searchParams, getCategory(id)]);
  return (
    <SearchPage
      key={id}
      initialQuery={(query ?? "").slice(0, 120)}
      initialCategory={id}
      categoryTitle={node?.self.title ?? "دسته‌بندی"}
    />
  );
}
