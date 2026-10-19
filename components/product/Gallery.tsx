"use client";

import { useRef, useState } from "react";
import { faDigits } from "@/lib/format";
import s from "./product.module.css";

export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  if (!images.length) {
    return (
      <div className={s.gallery}>
        <div className={s.noImage}>
          <img src="/icons/image.svg" width={24} height={24} alt="" />
          <p>بدون تصویر</p>
        </div>
      </div>
    );
  }

  return (
    <div className={s.gallery}>
      <div
        ref={track}
        className={s.track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
        }}
      >
        {images.map((src, i) => (
          <div key={src} className={s.slide}>
            <img src={src} alt={i === 0 ? title : ""} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <span className={s.counter}>
            {faDigits(index + 1)} / {faDigits(images.length)}
          </span>
          <div className={s.dots} aria-hidden>
            {images.map((src, i) => (
              <span key={src} data-on={i === index || undefined} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
