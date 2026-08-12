"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ItemIcon } from "@/components/ItemIcon";
import type { DbItem } from "@/data/dexDatabase";

export function ItemsTable({ items }: { items: DbItem[] }) {
  const [q, setQ] = useState("");
  const [champsOnly, setChampsOnly] = useState(true);
  const [sortFling, setSortFling] = useState(false);
  const [hideBerries, setHideBerries] = useState(false);
  const [hideMega, setHideMega] = useState(false);

  // Count in the active scope (before the text query), so the search
  // placeholder matches the Champions / Full-list toggle.
  const scopeCount = useMemo(
    () => items.filter((i) => !champsOnly || i.competitive).length,
    [items, champsOnly],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = items.filter(
      (i) =>
        (!champsOnly || i.competitive) &&
        (!hideBerries || !i.berry) &&
        (!hideMega || !i.mega) &&
        (!needle ||
          i.name.toLowerCase().includes(needle) ||
          i.desc.toLowerCase().includes(needle)),
    );
    return sortFling
      ? [...list].sort((a, b) => (b.fling ?? -1) - (a.fling ?? -1))
      : list;
  }, [items, q, champsOnly, sortFling, hideBerries, hideMega]);

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
        <button
          onClick={() => setHideBerries((s) => !s)}
          className={`rounded border px-3 py-1.5 text-xs ${hideBerries ? "border-amber-500 text-amber-300" : "border-slate-700 text-slate-300"}`}
        >
          {hideBerries ? "Berries hidden" : "Hide berries"}
        </button>
        <button
          onClick={() => setHideMega((s) => !s)}
          className={`rounded border px-3 py-1.5 text-xs ${hideMega ? "border-amber-500 text-amber-300" : "border-slate-700 text-slate-300"}`}
        >
          {hideMega ? "Mega stones hidden" : "Hide mega stones"}
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
                  <Link href={`/database/item/${encodeURIComponent(i.name)}`} className="flex items-center gap-1.5 hover:text-amber-300">
                    <ItemIcon item={i.name} />
                    {i.name}
                  </Link>
                </td>
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
