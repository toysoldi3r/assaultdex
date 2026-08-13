"use client";

// Move picker as a table: Move · Type · Pow · Acc · PP · Effect. Popular moves
// first, moves already on the set hidden, and a leading "clear" row to empty the
// slot (three moves are legal in this format).

import { useEffect, useMemo, useRef, useState } from "react";
import { TypeBadge } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import type { MoveMeta } from "./moveTypes";

export interface MoveRow {
  name: string;
  meta?: MoveMeta;
  pct?: string;
}

export function MoveSelectorPanel({
  title,
  forLabel,
  rows,
  popular = [],
  value,
  exclude = [],
  clearLabel,
  onSelect,
  onClose,
}: {
  title: string;
  forLabel?: string;
  rows: MoveRow[];
  popular?: MoveRow[];
  value?: string | null;
  exclude?: string[];
  clearLabel?: string;
  onSelect: (value: string | null) => void;
  onClose: () => void;
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
    const match = (r: MoveRow) =>
      !n ||
      r.name.toLowerCase().includes(n) ||
      (r.meta?.type ?? "").toLowerCase().includes(n) ||
      (r.meta?.category ?? "").toLowerCase().includes(n);
    // Moves already on the set are kept in the list but flagged (see Row) rather
    // than hidden, so a duplicate lookup shows it's already in the moveset.
    const pop = popular.filter(match);
    const rest = rows.filter((r) => !popularNames.has(r.name) && match(r));
    return { pop, rest };
  }, [q, rows, popular, popularNames]);

  const Row = ({ r, tag }: { r: MoveRow; tag?: "popular" }) => {
    const inSet = excludeSet.has(r.name);
    return (
      <tr
        onClick={() => { if (!inSet) { onSelect(r.name); onClose(); } }}
        aria-disabled={inSet}
        className={`border-b border-soft ${inSet ? "cursor-not-allowed opacity-45" : "cursor-pointer hover:bg-soft"} ${r.name === value ? "bg-soft" : ""}`}
      >
        <td className="px-2 py-1 font-medium text-t1">
          <span className="w-full">{r.name}</span>
          {inSet ? (
            <span className="ml-1 text-[9px] uppercase text-t3">in set</span>
          ) : tag === "popular" ? (
            <span className="ml-1 text-[9px] uppercase text-acc">popular</span>
          ) : null}
        </td>
        <td className="px-2 py-1">{r.meta && <TypeBadge type={r.meta.type} />}</td>
        <td className="px-2 py-1">{r.meta && <CategoryIcon category={r.meta.category} />}</td>
        <td className="px-2 py-1 text-right tabular-nums text-t2">{r.meta?.power ?? "-"}</td>
        <td className="px-2 py-1 text-right tabular-nums text-t2">
          {r.meta ? (r.meta.accuracy == null ? "-" : `${r.meta.accuracy}%`) : ""}
        </td>
        <td className="px-2 py-1 text-right tabular-nums text-t3">{r.meta?.pp ?? "-"}</td>
        <td className="px-2 py-1 text-[11px] text-t3">{r.meta?.desc ?? ""}</td>
      </tr>
    );
  };

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
          placeholder="Filter moves…"
          className="w-full rounded border border-accln bg-panel px-2 py-1 text-sm"
        />
      </div>

      <div className="max-h-[440px] overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-bg text-[10px] uppercase text-t3">
            <tr>
              <th className="px-2 py-1 font-normal">Move</th>
              <th className="px-2 py-1 font-normal">Type</th>
              <th className="px-2 py-1 text-right font-normal">Pow</th>
              <th className="px-2 py-1 text-right font-normal">Acc</th>
              <th className="px-2 py-1 text-right font-normal">PP</th>
              <th className="px-2 py-1 font-normal">Effect</th>
            </tr>
          </thead>
          <tbody>
            {clearLabel && !q && (
              <tr onClick={() => { onSelect(null); onClose(); }} className="cursor-pointer border-b border-soft hover:bg-soft">
                <td className="px-2 py-1 text-[9px] uppercase text-t3">clear</td>
                <td colSpan={6} className="px-2 py-1 text-[11px] text-t3">{clearLabel}</td>
              </tr>
            )}
            {filtered.pop.map((r) => <Row key={`pop-${r.name}`} r={r} tag="popular" />)}
            {filtered.rest.map((r) => <Row key={r.name} r={r} />)}
            {filtered.pop.length === 0 && filtered.rest.length === 0 && (
              <tr><td colSpan={7} className="px-2 py-2 text-t3">No matches.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {exclude.length > 0 && (
        <p className="border-t border-soft px-2 py-1 text-[10px] text-t3">
          {exclude.length} move{exclude.length === 1 ? "" : "s"} already on this set (marked “in set”).
        </p>
      )}
    </div>
  );
}
