"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ItemIcon } from "@/components/ItemIcon";
import { ITEM_CATEGORIES, type DbItem } from "@/data/dexDatabase";
import { useInfinite } from "./useInfinite";

type SortField = "" | "name" | "category" | "fling";

export function ItemsTable({ items = [] }: { items?: DbItem[] }) {
  const [q, setQ] = useState("");
  const [champsOnly, setChampsOnly] = useState(true);
  const [advOpen, setAdvOpen] = useState(false);
  // Advanced filters + sort (all folded into one panel).
  const [category, setCategory] = useState("");
  const [sortField, setSortField] = useState<SortField>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const advCount = (category ? 1 : 0) + (sortField ? 1 : 0);

  // No legal-item flags present → show the full list rather than nothing.
  const champsAvailable = useMemo(() => items.some((i) => i.competitive), [items]);

  const scopeCount = useMemo(
    () => items.filter((i) => !champsOnly || !champsAvailable || i.competitive).length,
    [items, champsOnly, champsAvailable],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = items.filter(
      (i) =>
        (!champsOnly || !champsAvailable || i.competitive) &&
        (!category || i.category === category) &&
        (!needle ||
          i.name.toLowerCase().includes(needle) ||
          i.desc.toLowerCase().includes(needle)),
    );
    if (!sortField) return list;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      let c = 0;
      if (sortField === "fling") c = (a.fling ?? -1) - (b.fling ?? -1);
      else if (sortField === "category") c = a.category.localeCompare(b.category);
      else c = a.name.localeCompare(b.name);
      return c * dir;
    });
  }, [items, q, champsOnly, champsAvailable, category, sortField, sortDir]);

  const sig = `${q}|${champsOnly}|${category}|${sortField}|${sortDir}`;
  const { visible, sentinel, shown } = useInfinite(filtered, sig, 50);
  const showFling = sortField === "fling";

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
          onClick={() => setAdvOpen((o) => !o)}
          className={`rounded border px-3 py-1.5 text-xs ${advOpen || advCount ? "border-amber-500 text-amber-300" : "border-slate-700 text-slate-300"}`}
        >
          Advanced filters{advCount ? ` (${advCount})` : ""} {advOpen ? "▴" : "▾"}
        </button>
        <span className="text-xs text-slate-500">{shown} / {filtered.length} shown</span>
      </div>

      {advOpen && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs">
          <label className="flex items-center gap-1.5 text-slate-400">
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100">
              <option value="">Any category</option>
              {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-slate-400">
            Sort by
            <select value={sortField} onChange={(e) => setSortField(e.target.value as SortField)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100">
              <option value="">Default</option>
              <option value="name">Name</option>
              <option value="category">Category</option>
              <option value="fling">Fling power</option>
            </select>
          </label>
          <button
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            disabled={!sortField}
            title="Toggle sort direction"
            className="rounded border border-slate-700 px-2 py-1 text-slate-300 disabled:opacity-40"
          >
            {sortDir === "asc" ? "Ascending ↑" : "Descending ↓"}
          </button>
          {advCount > 0 && (
            <button
              onClick={() => { setCategory(""); setSortField(""); setSortDir("asc"); }}
              className="rounded border border-slate-700 px-2 py-1 text-slate-400 hover:border-rose-500"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/60 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-normal">Item</th>
              <th className="px-3 py-2 font-normal">Category</th>
              <th className="px-3 py-2 font-normal">Effect</th>
              {showFling && <th className="px-3 py-2 text-right font-normal">Fling</th>}
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
                <td className="px-3 py-2 text-slate-300">{i.desc || "-"}</td>
                {showFling && <td className="px-3 py-2 text-right tabular-nums text-slate-400">{i.fling ?? "-"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        <span ref={sentinel as React.RefObject<HTMLSpanElement>} className="block h-px" />
      </div>
    </div>
  );
}
