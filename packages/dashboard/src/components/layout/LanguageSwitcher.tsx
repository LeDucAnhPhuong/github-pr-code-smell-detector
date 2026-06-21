"use client";

import { useLocale } from "next-intl";
import { useState, useTransition, useRef, useEffect } from "react";
import { Languages, Check } from "lucide-react";
import { setLocale } from "@/lib/locale-actions";
import { locales, localeNames, type Locale } from "@/i18n/locales";

export function LanguageSwitcher() {
  const current = useLocale();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(locale: Locale) {
    setOpen(false);
    if (locale === current) return;
    startTransition(() => {
      void setLocale(locale);
    });
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn btn-ghost btn-sm"
        disabled={isPending}
        title="Language"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Languages className="w-3.5 h-3.5" />
        <span style={{ textTransform: "uppercase", fontSize: 12 }}>{current}</span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 150,
            padding: 4,
            borderRadius: "var(--radius-card, 8px)",
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
            zIndex: 50,
          }}
        >
          {locales.map((loc) => (
            <button
              key={loc}
              role="menuitemradio"
              aria-checked={loc === current}
              onClick={() => choose(loc)}
              className="row"
              style={{
                width: "100%",
                gap: 8,
                padding: "7px 10px",
                fontSize: 13,
                borderRadius: 6,
                background: loc === current ? "var(--color-surface-hover, rgba(0,0,0,0.04))" : "transparent",
                color: "var(--color-text-primary)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Check
                className="w-3.5 h-3.5"
                style={{ opacity: loc === current ? 1 : 0, flexShrink: 0 }}
              />
              <span>{localeNames[loc]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
