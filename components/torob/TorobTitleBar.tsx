import Link from "next/link";
import s from "./TorobTitleBar.module.css";

// Torob's inner-page title bar (Layout_mobile_title-bar), measured on
// torob.com: sticky, 64px, white, 1px #f1f5f9 shadow, 14px/700 title.
export default function TorobTitleBar({ title, backHref }: { title: string; backHref?: string }) {
  return (
    <div className={s.bar}>
      {backHref && (
        <Link href={backHref} className={s.back} aria-label="بازگشت">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
      <h1 className={s.title}>{title}</h1>
    </div>
  );
}
