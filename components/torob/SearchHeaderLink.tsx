"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import TorobHeader from "./TorobHeader";

/** Torob's search header on pages that aren't the results page: submit → /search. */
export default function SearchHeaderLink({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  return (
    <TorobHeader
      value={value}
      onChange={setValue}
      onSubmit={() => {
        const q = value.trim();
        if (q) router.push(`/search?query=${encodeURIComponent(q)}`);
      }}
    />
  );
}
