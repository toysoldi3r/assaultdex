"use client";

// Inline selector panel — same shape as the EV/IV editor (opens below the card,
// not a floating dropdown) so it never clips the screen bottom. Search box, a
// "Popular in tournaments" section, and a scrollable list with descriptions.
// Used for item / ability / move / species pickers and adding Pokémon.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface Option {
  name: string;
  desc?: string;
}

export function SelectorPanel({
  title,
  options,
  popular = [],
  value,
  onSelect,
  onClose,
  allowClear = false,
  leading,
}: {
  title: string;
  options: Option[];
  popular?: Option[];
  value?: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
  allowClear?: boolean;
  /** Optional leading node (icon / type badge) rendered before each option. */
  leading?: (o: Option) => ReactNode;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return options;
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(n) || (o.desc ?? "").toLowerCase().includes(n),
    );
  }, [q, options]);

  const Row = ({ o, accent }: { o: Option; accent?: boolean }) => (
    <li>
      <button
        type="button"
        onClick={() => {
          onSelect(o.name);
          onClose();
        }}
        className={`flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left hover:bg-slate-800 ${
          o.name === value ? "bg-slate-800/60" : ""
        }`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {leading?.(o)}
          <span className="min-w-0">
            <span className="text-sm font-medium text-slate-100">{o.name}</span>
            {o.desc && !accent && (
              <span className="block truncate text-[11px] text-slate-500">{o.desc}</span>
            )}
          </span>
        </span>
        {accent && o.desc && (
          <span className="shrink-0 text-[10px] tabular-nums text-amber-400">{o.desc}</span>
        )}
      </button>
    </li>
  );

  return (
    <div className="mt-3 rounded border border-slate-800 bg-slate-950/40">
      <div className="flex items-center gap-2 border-b border-slate-800 p-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
        />
        {allowClear && (
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700"
        >
          ✕
        </button>
      </div>

      {!q && popular.length > 0 && (
        <div className="border-b border-slate-800">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-slate-600">
            Popular in tournaments
          </div>
          <ul>
            {popular.map((o) => (
              <Row key={`pop-${o.name}`} o={o} accent />
            ))}
          </ul>
        </div>
      )}

      <ul className="max-h-72 overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="px-2 py-2 text-xs text-slate-600">No matches.</li>
        ) : (
          filtered.map((o) => <Row key={o.name} o={o} />)
        )}
      </ul>
    </div>
  );
}
