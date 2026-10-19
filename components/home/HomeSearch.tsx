"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import s from "./home.module.css";

// Torob's home search box, measured on torob.com: 48px, #f1f5f9, gray search
// icon (not the red square of the results header), mic + camera on the left.
export default function HomeSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      className={s.searchForm}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?query=${encodeURIComponent(q.trim())}`);
      }}
    >
      <div className={s.box}>
        <button type="submit" className={s.searchIcon} aria-label="جست‌وجو">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="9.5 9.5 20.5 20.5" aria-hidden>
            <path
              d="M29.7,28.3 L25.2,23.8 C26.3,22.4 27,20.5 27,18.5 C27,13.8 23.2,10 18.5,10 C13.8,10 10,13.8 10,18.5 C10,23.2 13.8,27 18.5,27 C20.5,27 22.3,26.3 23.8,25.2 L28.3,29.7 C28.5,29.9 28.8,30 29,30 C29.2,30 29.5,29.9 29.7,29.7 C30.1,29.3 30.1,28.7 29.7,28.3 Z M12,18.5 C12,14.9 14.9,12 18.5,12 C22.1,12 25,14.9 25,18.5 C25,20.3 24.3,21.9 23.1,23.1 C21.9,24.3 20.3,25 18.5,25 C14.9,25 12,22.1 12,18.5 Z"
              fill="currentColor"
            />
          </svg>
        </button>
        <input
          className={s.input}
          type="search"
          enterKeyHint="search"
          placeholder="نام کالا یا فروشگاه"
          aria-label="نام کالا یا فروشگاه"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className={s.iconBtn} aria-label="جست‌وجوی صوتی">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
            <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V20H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.08A7 7 0 0 0 19 11z" />
          </svg>
        </button>
        <span className={s.divider} aria-hidden />
        <button type="button" className={s.cameraBtn} aria-label="جست‌وجو با تصویر">
          <svg width="24" height="24" viewBox="-2 -2 26 26" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <g transform="translate(1, 3)">
              <path
                d="M10,18 L2,18 C0.8954305,18 0,17.1045695 0,16 L0,13 M0,8 L0,5 C0,3.8954305 0.8954305,3 2,3 L6,3 L8,0 L14,0 L16,3 L20,3 C21.1045695,3 22,3.8954305 22,5 L22,10"
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle fill="currentColor" cx="20" cy="15.75" r="2" />
              <circle fill="currentColor" cx="11" cy="10" r="4" />
            </g>
          </svg>
        </button>
      </div>
    </form>
  );
}
