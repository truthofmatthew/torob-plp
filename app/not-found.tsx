import Link from "next/link";
import Shell from "@/components/Shell";
import s from "@/components/Shell.module.css";

export default function NotFound() {
  return (
    <Shell header={{ kind: "search" }}>
      <div className={s.empty}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>این صفحه پیدا نشد</p>
        <p>ممکن است کالا دیگر در ترب نباشد.</p>
        <p style={{ marginTop: 12 }}>
          <Link href="/" style={{ color: "var(--color-brand-primary)", fontWeight: 600 }}>
            بازگشت به صفحه‌ی اصلی
          </Link>
        </p>
      </div>
    </Shell>
  );
}
