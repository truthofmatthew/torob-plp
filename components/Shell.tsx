import TorobBottomNav from "./torob/TorobBottomNav";
import SearchHeaderLink from "./torob/SearchHeaderLink";
import TorobTitleBar from "./torob/TorobTitleBar";
import s from "./Shell.module.css";

// Page frame shared by every route: Torob's unchanged header (search or title
// bar) on top, Torob's unchanged bottom nav below, a 480px phone column between.
export default function Shell({
  header,
  children,
}: {
  header: { kind: "search"; initial?: string; back?: boolean } | { kind: "title"; title: string; backHref?: string } | { kind: "none" };
  children: React.ReactNode;
}) {
  return (
    <>
      {header.kind === "search" && <SearchHeaderLink initial={header.initial} back={header.back} />}
      <main className={s.main} data-header={header.kind}>
        {header.kind === "title" && <TorobTitleBar title={header.title} backHref={header.backHref} />}
        {children}
      </main>
      <TorobBottomNav />
    </>
  );
}
