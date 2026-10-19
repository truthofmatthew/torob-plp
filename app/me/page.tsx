import { Suspense } from "react";
import MeView from "@/components/me/MeView";
import Shell from "@/components/Shell";

export const metadata = { title: "ترب من · ترب (نمونه)" };

export default function Me() {
  return (
    <Shell header={{ kind: "title", title: "ترب من" }}>
      <Suspense>
        <MeView />
      </Suspense>
    </Shell>
  );
}
