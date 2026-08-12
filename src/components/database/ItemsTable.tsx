"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ItemIcon } from "@/components/ItemIcon";
import { ITEM_CATEGORIES, type DbItem } from "@/data/dexDatabase";

export function ItemsTable({ items }: { items: DbItem[] }) {
  const [q, setQ] = useState("");
  const [champsOnly, setChampsOnly] = useState(true);
  const [advOpen, setAdvOpen] = useState(false);
  // Advanced filters (folded into one panel).
  const [category, setCategory] = useState("");
  const [hideBerries, setHideBerries] = useState(false);
  const [hideMega, setHideMega] = useState(false);
  const [sortFling, setSortFling] = useState(false);

  const advCount =
    (category ? 1 : 0) + (hideBerries ? 1 : 0) + (hideMega ? 1 : 0) + (sortFling ? 1 : 0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = items.filter(
      (i) =>
        (!champsOnly || i.competitive) &&
        (!category || i.category === category) &&
        (!hideBerries || !i.berry) &&
        (!hideMega || !i.mega) &&
        (!needle ||
          i.name.toLowerCase().includes(needle) ||
          i.desc.toLowerCase().includes(needle)),
    );
    return sortFling
      ? [...list].sort((a, b) => (b.fling ?? -1) - (a.fling ?? -1))
      : list;
  }, [items, q, champsOnly, category, sortFling, hideBerries, hideMega]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${items.length} items…`}
          className="w-64 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
        />
        <div className="flex overflow-hidden rounded border border-slate-700 text-xs">
          <button
            onClick={() => setChampsOnly(true)}
            className={`px-3 py-1.5 ${champsOnly ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}
          >
            Champions
          </button>
          <button
            onClick={() => setChampsOnly(false)}
            className={`px-3 py-1.5 ${!champsOnly ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}
          >
            Full list
          </button>
        </div>
        <button
          onClick={() => setAdvOpen((o) => !o)}
          className={`rounded border px-3 py-1.5 text-xs ${advOpen || advCount ? "border-amber-500 text-amber-300" : "border-slate-700 text-slate-300"}`}
        >
          Advanced filters{advCount ? ` (${advCount})` : ""} {advOpen ? "▴" : "▾"}
        </button>
        <span className="text-xs text-slate-500">{filtered.length} shown</span>
      </div>

      {advOpen && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs">
          <label className="flex items-center gap-1.5 text-slate-400">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
            >
              <option value="">Any category</option>
              {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-slate-300">
            <input type="checkbox" checked={hideBerries} onChange={(e) => setHideBerries(e.target.checked)} />
            Hide berries
          </label>
          <label className="flex items-center gap-1.5 text-slate-300">
            <input type="checkbox" checked={hideMega} onChange={(e) => setHideMega(e.target.checked)} />
            Hide mega stones
          </label>
          <label className="flex items-center gap-1.5 text-slate-300">
            <input type="checkbox" checked={sortFling} onChange={(e) => setSortFling(e.target.checked)} />
            Sort by Fling power
          </label>
          {advCount > 0 && (
            <button
              onClick={() => { setCategory(""); setHideBerries(false); setHideMega(false); setSortFling(false); }}
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
              <th className="px-3 py-2 text-right font-normal">Fling</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.name} className="border-t border-slate-800/60 align-top">
                <td className="whitespace-nowrap px-3 py-2 font-medium">
                  <Link href={`/database/item/${encodeURIComponent(i.name)}`} className="flex items-center gap-1.5 hover:text-amber-300">
                    <ItemIcon item={i.name} />
                    {i.name}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-400">{i.category}</td>
                <td className="px-3 py-2 text-slate-300">{i.desc || "-"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                  {i.fling ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
