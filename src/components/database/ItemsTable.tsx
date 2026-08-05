"use client";

import { useMemo, useState } from "react";
import { ItemIcon } from "@/components/ItemIcon";
import type { DbItem } from "@/data/dexDatabase";

export function ItemsTable({ items }: { items: DbItem[] }) {
  const [q, setQ] = useState("");
  const [champsOnly, setChampsOnly] = useState(true);
  const [sortFling, setSortFling] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = items.filter(
      (i) =>
        (!champsOnly || i.competitive) &&
        (!needle ||
          i.name.toLowerCase().includes(needle) ||
          i.desc.toLowerCase().includes(needle)),
    );
    return sortFling
      ? [...list].sort((a, b) => (b.fling ?? -1) - (a.fling ?? -1))
      : list;
  }, [items, q, champsOnly, sortFling]);

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
          onClick={() => setSortFling((s) => !s)}
          className={`rounded border px-3 py-1.5 text-xs ${sortFling ? "border-amber-500 text-amber-300" : "border-slate-700 text-slate-300"}`}
        >
          {sortFling ? "↓ Fling power" : "Sort by Fling"}
        </button>
        <span className="text-xs text-slate-500">{filtered.length} shown</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/60 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-normal">Item</th>
              <th className="px-3 py-2 font-normal">Effect</th>
              <th className="px-3 py-2 text-right font-normal">Fling</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.name} className="border-t border-slate-800/60 align-top">
                <td className="whitespace-nowrap px-3 py-2 font-medium">
                  <span className="flex items-center gap-1.5">
                    <ItemIcon item={i.name} />
                    {i.name}
                    {/* Special-interaction marker: calculation shows on hover. */}
                    {i.calc && (
                      <span
                        title={i.calc}
                        className="cursor-help rounded-full border border-emerald-600/60 px-1 text-[9px] text-emerald-300"
                      >
                        ⓘ calc
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-300">{i.desc || "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                  {i.fling ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
