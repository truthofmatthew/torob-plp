"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// Counts in-app navigations so «بازگشت» can go back inside the prototype, and
// falls back to home when a product link was opened directly.
let navigations = 0;
let lastPath: string | null = null;

export function NavTracker() {
  const path = usePathname();
  useEffect(() => {
    if (lastPath !== null && lastPath !== path) navigations++;
    lastPath = path;
  }, [path]);
  return null;
}

export function useGoBack() {
  const router = useRouter();
  return () => {
    if (navigations > 0) {
      navigations--;
      router.back();
    } else {
      router.push("/");
    }
  };
}
