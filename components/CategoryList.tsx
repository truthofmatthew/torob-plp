import Link from "next/link";
import type { Category } from "@/lib/catalog";
import s from "./CategoryList.module.css";

// Torob's «همه دسته‌ها» list: icon (root only), title, chevron; 56px rows.
export default function CategoryList({
  items,
  allHref,
  allLabel,
}: {
  items: Category[];
  allHref?: string;
  allLabel?: string;
}) {
  return (
    <ul className={s.list}>
      {allHref && (
        <li>
          <Link href={allHref} className={s.row} prefetch={false}>
            <span className={s.title} data-strong>
              {allLabel}
            </span>
            <Chevron />
          </Link>
        </li>
      )}
      {items.map((c) => (
        <li key={c.id}>
          <Link
            href={c.hasChildren ? `/categories/${c.id}` : `/browse/${c.id}`}
            className={s.row}
            prefetch={false}
          >
            {c.icon && <img src={c.icon} alt="" width={24} height={24} className={s.icon} loading="lazy" />}
            <span className={s.title}>{c.title}</span>
            <Chevron />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Chevron() {
  return (
    <svg className={s.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
