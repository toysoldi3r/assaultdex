"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ItemIcon } from "@/components/ItemIcon";
import { type DbItem } from "@/data/dexDatabase";
import { useInfinite } from "./useInfinite";

export function ItemsTable({ items = [] }: { items?: DbItem[] }) {
  const [q, setQ] = useState("");
  const [champsOnly, setChampsOnly] = useState(true);

  // No legal-item flags present → show the full list rather than nothing.
  const champsAvailable = useMemo(() => items.some((i) => i.competitive), [items]);

  const scopeCount = useMemo(
    () => items.filter((i) => !champsOnly || !champsAvailable || i.competitive).length,
    [items, champsOnly, champsAvailable],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!champsOnly || !champsAvailable || i.competitive) &&
        (!needle ||
          i.name.toLowerCase().includes(needle) ||
          i.desc.toLowerCase().includes(needle)),
    );
  }, [items, q, champsOnly, champsAvailable]);

  const sig = `${q}|${champsOnly}`;
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
        <span className="text-xs text-slate-500">{shown} / {filtered.length} shown</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/60 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-normal">Item</th>
              <th className="px-3 py-2 font-normal">Category</th>
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
                <td className="px-3 py-2 text-slate-300">{i.desc || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <span ref={sentinel as React.RefObject<HTMLSpanElement>} className="block h-px" />
      </div>
    </div>
  );
}
