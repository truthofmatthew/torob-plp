import CategoryList from "@/components/CategoryList";
import Shell from "@/components/Shell";
import { getCategory } from "@/lib/catalog";
import s from "@/components/Shell.module.css";

export const revalidate = 3600;
export const metadata = { title: "همه دسته‌ها · ترب (نمونه)" };

export default async function Categories() {
  const root = await getCategory(0);
  return (
    <Shell header={{ kind: "title", title: "همه دسته‌ها" }}>
      {root ? (
        <CategoryList items={root.children} />
      ) : (
        <p className={s.empty}>فهرست دسته‌ها بارگیری نشد. کمی بعد دوباره امتحان کنید.</p>
      )}
    </Shell>
  );
}
