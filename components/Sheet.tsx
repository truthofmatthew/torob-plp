"use client";

import { useEffect, useRef } from "react";
import s from "./Sheet.module.css";

// Minimal bottom sheet on <dialog>: focus trap, Esc and backdrop close for free.
export default function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={s.sheet}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className={s.inner}>
        <div className={s.handle} aria-hidden />
        <h2 className={s.title}>{title}</h2>
        {children}
      </div>
    </dialog>
  );
}

export function SheetOption({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={s.option} aria-pressed={selected} onClick={onClick}>
      <span>{children}</span>
      <span className={s.radio} data-on={selected || undefined} aria-hidden />
    </button>
  );
}
