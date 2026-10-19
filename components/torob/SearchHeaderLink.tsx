"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGoBack } from "@/lib/nav";
import TorobHeader from "./TorobHeader";

/** Torob's search header on pages that aren't the results page: submit → /search. */
export default function SearchHeaderLink({ initial = "", back = false }: { initial?: string; back?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const goBack = useGoBack();
  return (
    <TorobHeader
      value={value}
      onChange={setValue}
      onBack={back ? goBack : undefined}
      onSubmit={() => {
        const q = value.trim();
        if (q) router.push(`/search?query=${encodeURIComponent(q)}`);
      }}
    />
  );
}
