"use client";

// Inline selector panel (item / ability / species / add-Pokémon). Opens below
// the card, single column. Popular options are tagged and listed first; options
// already on the set are hidden; a leading "clear" row (when provided) is the
// only way to unset the current value.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface Option {
  name: string;
  desc?: string;
}

export function SelectorPanel({
  title,
  forLabel,
  options,
  popular = [],
  value,
  exclude = [],
  clearLabel,
  onSelect,
  onClose,
  leading,
}: {
  title: string;
  /** e.g. "for Garchomp" shown after the title. */
  forLabel?: string;
  options: Option[];
  popular?: Option[];
  value?: string | null;
  /** Names to hide (already on the set). */
  exclude?: string[];
  /** When set, a leading row clears the value; this is its description text. */
  clearLabel?: string;
  onSelect: (value: string | null) => void;
  onClose: () => void;
  leading?: (o: Option) => ReactNode;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const excludeSet = useMemo(() => new Set(exclude), [exclude]);
  const popularNames = useMemo(() => new Set(popular.map((p) => p.name)), [popular]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    const match = (o: Option) =>
      !n || o.name.toLowerCase().includes(n) || (o.desc ?? "").toLowerCase().includes(n);
    const pop = popular.filter((o) => !excludeSet.has(o.name) && match(o));
    const rest = options.filter(
      (o) => !excludeSet.has(o.name) && !popularNames.has(o.name) && match(o),
    );
    return { pop, rest };
  }, [q, options, popular, excludeSet, popularNames]);

  const Row = ({ o, tag }: { o: Option; tag?: "popular" }) => (
    <li>
      <button
        type="button"
        onClick={() => { onSelect(o.name); onClose(); }}
        className={`flex w-full items-center gap-2 border-b border-soft px-2 py-1.5 text-left hover:bg-soft ${
          o.name === value ? "bg-soft" : ""
        }`}
      >
        <span className="w-[52px] shrink-0 text-[9px] font-semibold uppercase tracking-wide text-acc">
          {tag === "popular" ? "popular" : ""}
        </span>
        {leading && <span className="shrink-0">{leading(o)}</span>}
        <span className="min-w-0 flex-1">
          <span className="text-sm font-medium text-t1">{o.name}</span>
          {o.desc && <span className="block truncate text-[11px] text-t3">{o.desc}</span>}
        </span>
      </button>
    </li>
  );

  const hiddenCount = exclude.length;

  return (
    <div className="rounded border border-line bg-bg">
      <div className="flex items-center gap-2 border-b border-line p-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-t2">{title}</span>
        {forLabel && <span className="text-[11px] text-t3">{forLabel}</span>}
        <span className="flex-1" />
        <button type="button" onClick={onClose} className="rounded bg-raise px-2 py-1 text-xs text-t2 hover:text-t1">✕</button>
      </div>
      <div className="p-2">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter…"
          className="w-full rounded border border-accln bg-panel px-2 py-1 text-sm"
        />
      </div>

      <ul className="max-h-[440px] overflow-y-auto">
        {clearLabel && !q && (
          <li>
            <button
              type="button"
              onClick={() => { onSelect(null); onClose(); }}
              className="flex w-full items-center gap-2 border-b border-soft px-2 py-1.5 text-left hover:bg-soft"
            >
              <span className="w-[52px] shrink-0 text-[9px] font-semibold uppercase tracking-wide text-t3">clear</span>
              <span className="text-[11px] text-t3">{clearLabel}</span>
            </button>
          </li>
        )}
        {filtered.pop.map((o) => <Row key={`pop-${o.name}`} o={o} tag="popular" />)}
        {filtered.rest.map((o) => <Row key={o.name} o={o} />)}
        {filtered.pop.length === 0 && filtered.rest.length === 0 && (
          <li className="px-2 py-2 text-xs text-t3">No matches.</li>
        )}
      </ul>

      {hiddenCount > 0 && (
        <p className="border-t border-soft px-2 py-1 text-[10px] text-t3">
          {hiddenCount} already on this set {hiddenCount === 1 ? "is" : "are"} hidden.
        </p>
      )}
    </div>
  );
}
