import { notFound, redirect } from "next/navigation";
import CategoryList from "@/components/CategoryList";
import Shell from "@/components/Shell";
import { getCategory } from "@/lib/catalog";

// Rendered per request (not at build: the build machine can't reliably reach
// Torob); lib/torob.ts's 5-minute cache keeps upstream calls the same.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const node = await getCategory(Number((await params).id));
  return { title: node ? `${node.self.title} · ترب (نمونه)` : "دسته‌بندی" };
}

export default async function CategoryPage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const node = await getCategory(id);
  if (!node) notFound();
  if (!node.children.length) redirect(`/browse/${id}`);

  const back = node.self.parentId ? `/categories/${node.self.parentId}` : "/categories";
  return (
    <Shell header={{ kind: "title", title: node.self.title, backHref: back }}>
      <CategoryList items={node.children} allHref={`/browse/${id}`} allLabel={`همه‌ی کالاهای ${node.self.title}`} />
    </Shell>
  );
}
