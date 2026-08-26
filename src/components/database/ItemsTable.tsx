"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ItemIcon } from "@/components/ItemIcon";
import { type DbItem } from "@/data/dexDatabase";
import { useInfinite } from "./useInfinite";

type SortKey = "name" | "category" | "fling";
type Dir = "asc" | "desc";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "fling", label: "Fling power" },
];

const nkey = (v: number | null, dir: Dir) => (v == null ? (dir === "asc" ? Infinity : -Infinity) : v);

// Shared toggle-pill style (active = amber). Keeps the button rows consistent.
export const pill = (active: boolean) =>
  `rounded border px-2.5 py-1 ${active ? "border-amber-500 bg-amber-500 font-semibold text-black" : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"}`;

export function ItemsTable({ items = [] }: { items?: DbItem[] }) {
  const [q, setQ] = useState("");
  const [champsOnly, setChampsOnly] = useState(true);
  const [advanced, setAdvanced] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [dir, setDir] = useState<Dir>("asc");
  const [category, setCategory] = useState("all");
  const [berriesOnly, setBerriesOnly] = useState(false);

  // No legal-item flags present → show the full list rather than nothing.
  const champsAvailable = useMemo(() => items.some((i) => i.competitive), [items]);
  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(),
    [items],
  );

  const inScope = (i: DbItem) =>
    (!champsOnly || !champsAvailable || i.competitive) &&
    (category === "all" || i.category === category) &&
    (!berriesOnly || i.berry);

  const scopeCount = useMemo(
    () => items.filter(inScope).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, champsOnly, champsAvailable, category, berriesOnly],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = items.filter(
      (i) =>
        inScope(i) &&
        (!needle ||
          i.name.toLowerCase().includes(needle) ||
          i.desc.toLowerCase().includes(needle)),
    );
    const s = dir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      let d = 0;
      switch (sortKey) {
        case "name": d = a.name.localeCompare(b.name); break;
        case "category": d = a.category.localeCompare(b.category) || a.name.localeCompare(b.name); break;
        case "fling": d = nkey(a.fling, dir) - nkey(b.fling, dir); break;
      }
      return d * s;
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, q, champsOnly, champsAvailable, category, berriesOnly, sortKey, dir]);

  const sig = `${q}|${champsOnly}|${sortKey}|${dir}|${category}|${berriesOnly}`;
  const { visible, sentinel, shown } = useInfinite(filtered, sig, 50);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${scopeCount} ${champsOnly ? "Champions" : ""} items…`}
          className="w-64 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
        />
        <div className="flex overflow-hidden rounded border border-slate-700 text-xs">
          <button onClick={() => setChampsOnly(true)} className={`px-3 py-1.5 ${champsOnly ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}>Champions</button>
          <button onClick={() => setChampsOnly(false)} className={`px-3 py-1.5 ${!champsOnly ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}>Full list</button>
        </div>
        <button
          onClick={() => setAdvanced((a) => !a)}
          className={`rounded border px-3 py-1.5 text-xs ${advanced ? "border-amber-500 text-amber-300" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}
        >
          Advanced filters {advanced ? "▲" : "▼"}
        </button>
        <span className="text-xs text-slate-500">{shown} / {filtered.length} shown</span>
      </div>

      {advanced && (
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">Sort by</span>
            {SORTS.map((s) => (
              <button key={s.key} onClick={() => setSortKey(s.key)} className={pill(sortKey === s.key)}>{s.label}</button>
            ))}
            <span className="ml-2 flex overflow-hidden rounded border border-slate-700">
              <button onClick={() => setDir("asc")} className={`px-3 py-1.5 font-medium ${dir === "asc" ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-200 hover:bg-slate-800"}`}>↑ Ascending</button>
              <button onClick={() => setDir("desc")} className={`border-l border-slate-700 px-3 py-1.5 font-medium ${dir === "desc" ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-200 hover:bg-slate-800"}`}>↓ Descending</button>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">Category</span>
            <button onClick={() => setCategory("all")} className={pill(category === "all")}>All</button>
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={pill(category === c)}>{c}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">Filter</span>
            <button onClick={() => setBerriesOnly((v) => !v)} className={pill(berriesOnly)}>Berries only</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/60 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-normal">Item</th>
              <th className="px-3 py-2 font-normal">Category</th>
              <th className="px-3 py-2 text-right font-normal">Fling</th>
              <th className="px-3 py-2 font-normal">Effect</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((i) => (
              <tr key={i.name} className="border-t border-slate-800/60 align-top">
                <td className="whitespace-nowrap px-3 py-2 font-medium">
                  <Link href={`/database/item/${encodeURIComponent(i.name)}`} className="flex items-center gap-1.5 hover:text-amber-300">
                    {/* Fixed-width slot so the name aligns whether or not the
                        item has a sprite (Mega Stones have none). */}
                    <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center">
                      <ItemIcon item={i.name} />
                    </span>
                    {i.name}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-400">{i.category}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-400">{i.fling ?? "-"}</td>
                <td className="px-3 py-2 text-slate-300">{i.desc || "-"}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No items match.</td></tr>
            )}
          </tbody>
        </table>
        <span ref={sentinel as React.RefObject<HTMLSpanElement>} className="block h-px" />
      </div>
    </div>
  );
}
