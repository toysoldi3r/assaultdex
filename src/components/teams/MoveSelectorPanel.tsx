"use client";

// Move picker rendered as a proper table: Name · Type · Category · Power ·
// Accuracy · PP · Description. Consistent column widths so the type icon does
// not dwarf the numbers. Search + Popular section like the generic selector.

import { useEffect, useMemo, useRef, useState } from "react";
import { TypeBadge } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import type { MoveMeta } from "./moveTypes";

export interface MoveRow {
  name: string;
  meta?: MoveMeta;
  /** Optional popularity string, e.g. "42%". */
  pct?: string;
}

export function MoveSelectorPanel({
  title,
  rows,
  popular = [],
  value,
  onSelect,
  onClose,
  allowClear = true,
}: {
  title: string;
  rows: MoveRow[];
  popular?: MoveRow[];
  value?: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
  allowClear?: boolean;
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

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(n) ||
        (r.meta?.type ?? "").toLowerCase().includes(n) ||
        (r.meta?.category ?? "").toLowerCase().includes(n),
    );
  }, [q, rows]);

  const Row = ({ r }: { r: MoveRow }) => (
    <tr
      onClick={() => {
        onSelect(r.name);
        onClose();
      }}
      className={`cursor-pointer border-t border-slate-800/60 hover:bg-slate-800/60 ${
        r.name === value ? "bg-slate-800/50" : ""
      }`}
    >
      <td className="px-2 py-1 font-medium text-slate-100">
        {r.name}
        {r.pct && <span className="ml-1 text-[10px] text-amber-400">{r.pct}</span>}
      </td>
      <td className="px-2 py-1">{r.meta && <TypeBadge type={r.meta.type} />}</td>
      <td className="px-2 py-1">{r.meta && <CategoryIcon category={r.meta.category} />}</td>
      <td className="px-2 py-1 text-right tabular-nums text-slate-300">{r.meta?.power ?? "-"}</td>
      <td className="px-2 py-1 text-right tabular-nums text-slate-300">
        {r.meta ? (r.meta.accuracy == null ? "-" : `${r.meta.accuracy}%`) : ""}
      </td>
      <td className="px-2 py-1 text-right tabular-nums text-slate-400">{r.meta?.pp ?? "-"}</td>
      <td className="px-2 py-1 text-[11px] text-slate-500">{r.meta?.desc ?? ""}</td>
    </tr>
  );

  return (
    <div className="mt-3 rounded border border-slate-800 bg-slate-950/40">
      <div className="flex items-center gap-2 border-b border-slate-800 p-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search moves…"
          className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
        />
        {allowClear && (
          <button type="button" onClick={() => { onSelect(null); onClose(); }} className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700">
            Clear
          </button>
        )}
        <button type="button" onClick={onClose} className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700">✕</button>
      </div>

      <div className="max-h-80 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-950/90 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-2 py-1 font-normal">Move</th>
              <th className="px-2 py-1 font-normal">Type</th>
              <th className="px-2 py-1 font-normal">Cat</th>
              <th className="px-2 py-1 text-right font-normal">Pow</th>
              <th className="px-2 py-1 text-right font-normal">Acc</th>
              <th className="px-2 py-1 text-right font-normal">PP</th>
              <th className="px-2 py-1 font-normal">Description</th>
            </tr>
          </thead>
          <tbody>
            {!q && popular.length > 0 && (
              <>
                <tr><td colSpan={7} className="px-2 py-0.5 text-[10px] uppercase text-slate-600">Popular</td></tr>
                {popular.map((r) => <Row key={`pop-${r.name}`} r={r} />)}
                <tr><td colSpan={7} className="px-2 py-0.5 text-[10px] uppercase text-slate-600">All moves</td></tr>
              </>
            )}
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-2 py-2 text-slate-600">No matches.</td></tr>
            ) : (
              filtered.map((r) => <Row key={r.name} r={r} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
