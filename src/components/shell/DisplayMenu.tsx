"use client";

// Settings popover anchored to the top-bar button. Owns theme plus display
// preferences (sprite / type-badge style). The Pokémon sprite style is live -
// picking it re-renders every sprite in the app (see src/lib/spriteStyle.ts).
// Type-badge styles are shown disabled until their self-hosted assets exist.

import { useEffect, useRef } from "react";
import { setSpriteStyle, useSpriteStyle, type SpriteStyle } from "@/lib/spriteStyle";

type Theme = "dark" | "light";

const THEME_KEY = "assaultdex.theme";
const TYPE_KEY = "assaultdex.typeStyle";

function set(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

interface Opt {
  value: string;
  label: string;
  note?: string;
  disabled?: boolean;
}

export function DisplayMenu({
  open,
  onClose,
  theme,
  onTheme,
}: {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  onTheme: (t: Theme) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    // Defer so the click that opened the menu doesn't immediately close it.
    const t = setTimeout(() => document.addEventListener("mousedown", onDown), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  const applyTheme = (t: Theme) => {
    document.documentElement.dataset.theme = t;
    set(THEME_KEY, t);
    onTheme(t);
  };

  const typeOpts: Opt[] = [
    { value: "text", label: "Text labels", note: "default" },
    { value: "gen9", label: "Gen 9 icons", note: "needs asset", disabled: true },
    { value: "gen5", label: "Gen 5 icons", note: "needs asset", disabled: true },
  ];

  return (
    <>
      {/* Dimmed scrim behind the bottom sheet on mobile; the popover has none. */}
      <div className="fixed inset-0 z-30 bg-black/50 md:hidden" aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-label="Display settings"
        className="fixed inset-x-0 bottom-0 z-40 w-full rounded-t-2xl border-t border-line bg-panel p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:absolute md:inset-x-auto md:bottom-auto md:right-5 md:top-14 md:w-[290px] md:rounded-[10px] md:border md:p-3.5 md:pb-3.5"
        style={{ boxShadow: "0 -18px 40px rgba(0,0,0,.35)" }}
      >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-t3">Display</span>
        <button onClick={onClose} className="text-[13px] text-t3 hover:text-t2" aria-label="Close">✕</button>
      </div>

      <p className="mt-3 text-xs text-t2">Theme</p>
      <div className="mt-1.5 flex gap-2">
        {(["dark", "light"] as Theme[]).map((t) => (
          <button
            key={t}
            onClick={() => applyTheme(t)}
            className={`flex-1 rounded-md border px-2 py-1.5 text-xs capitalize ${
              theme === t ? "border-accln bg-accbg text-acc" : "border-line text-t2 hover:bg-soft"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <SpriteGroup />
      <OptGroup label="Type badges" storageKey={TYPE_KEY} defaultValue="text" options={typeOpts} />

      <p className="mt-3 text-[11px] leading-4 text-t3">Choices are remembered on this device.</p>
      </div>
    </>
  );
}

// Live Pokémon-sprite selector: writes through to the shared store so every
// sprite in the app re-renders immediately.
function SpriteGroup() {
  const current = useSpriteStyle();
  const options: { value: SpriteStyle; label: string; note?: string }[] = [
    { value: "pixel", label: "Pixel icons", note: "default" },
    { value: "artwork", label: "Official artwork" },
    { value: "home", label: "3D renders" },
  ];
  return (
    <>
      <p className="mt-3.5 text-xs text-t2">Pokémon sprites</p>
      <div className="mt-1.5 space-y-1.5">
        {options.map((o) => {
          const selected = current === o.value;
          return (
            <button
              key={o.value}
              onClick={() => setSpriteStyle(o.value)}
              aria-pressed={selected}
              className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs ${
                selected ? "border-accln bg-accbg text-acc" : "border-line text-t2 hover:bg-soft"
              }`}
            >
              <span>{o.label}</span>
              {o.note && (
                <span className="text-[10px] uppercase tracking-[0.04em] text-t3">{o.note}</span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

function OptGroup({
  label,
  storageKey,
  defaultValue,
  options,
}: {
  label: string;
  storageKey: string;
  defaultValue: string;
  options: Opt[];
}) {
  // These preferences have no rendered effect yet (only the default is
  // implementable), so selection is stored but not lifted into app state.
  const stored = (() => {
    try {
      return localStorage.getItem(storageKey) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  })();

  return (
    <>
      <p className="mt-3.5 text-xs text-t2">{label}</p>
      <div className="mt-1.5 space-y-1.5">
        {options.map((o) => {
          const selected = stored === o.value;
          return (
            <button
              key={o.value}
              disabled={o.disabled}
              onClick={() => !o.disabled && set(storageKey, o.value)}
              className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs disabled:opacity-50 ${
                selected ? "border-accln bg-accbg text-acc" : "border-line text-t2 hover:bg-soft"
              }`}
            >
              <span>{o.label}</span>
              {o.note && (
                <span className="text-[10px] uppercase tracking-[0.04em] text-t3">{o.note}</span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
