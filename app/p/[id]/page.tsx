import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductView from "@/components/product/ProductView";
import Shell from "@/components/Shell";
import { getProductPage } from "@/lib/product";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await getProductPage(id);
  return { title: p ? `${p.title} · ترب (نمونه)` : "کالا پیدا نشد" };
}

export default async function ProductRoute({ params }: Props) {
  const { id } = await params;
  const p = await getProductPage(id);
  if (!p) notFound();
  return (
    <Shell header={{ kind: "search" }}>
      <ProductView p={p} />
    </Shell>
  );
}
