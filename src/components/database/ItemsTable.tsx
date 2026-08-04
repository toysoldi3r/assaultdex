"use client";

import { useMemo, useState } from "react";
import { ItemIcon } from "@/components/ItemIcon";
import type { DbItem } from "@/data/dexDatabase";

export function ItemsTable({ items }: { items: DbItem[] }) {
  const [q, setQ] = useState("");
  const [modeledOnly, setModeledOnly] = useState(false);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!modeledOnly || i.calc) &&
        (!needle ||
          i.name.toLowerCase().includes(needle) ||
          i.desc.toLowerCase().includes(needle)),
    );
  }, [items, q, modeledOnly]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${items.length} items…`}
          className="w-64 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={modeledOnly}
            onChange={(e) => setModeledOnly(e.target.checked)}
          />
          Only items with a modeled calculation
        </label>
        <span className="text-xs text-slate-500">{filtered.length} shown</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/60 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-normal">Item</th>
              <th className="px-3 py-2 font-normal">Effect</th>
              <th className="px-3 py-2 font-normal">Calc</th>
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
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-300">{i.desc || "—"}</td>
                <td className="px-3 py-2 text-xs text-emerald-300">{i.calc ?? ""}</td>
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
