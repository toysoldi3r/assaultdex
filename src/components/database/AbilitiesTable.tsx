"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DbAbility } from "@/data/dexDatabase";
import { useInfinite } from "./useInfinite";

type SortField = "" | "name" | "rating";

export function AbilitiesTable({
  abilities = [],
  championsAbilities = [],
}: {
  abilities?: DbAbility[];
  championsAbilities?: string[];
}) {
  const [q, setQ] = useState("");
  const [champsOnly, setChampsOnly] = useState(true);
  const [advOpen, setAdvOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const champs = useMemo(() => new Set(championsAbilities), [championsAbilities]);
  const advCount = sortField ? 1 : 0;

  const scopeCount = useMemo(
    () => abilities.filter((a) => !champsOnly || champs.has(a.name)).length,
    [abilities, champsOnly, champs],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = abilities.filter(
      (a) =>
        (!champsOnly || champs.has(a.name)) &&
        (!needle ||
          a.name.toLowerCase().includes(needle) ||
          a.desc.toLowerCase().includes(needle)),
    );
    if (!sortField) return list;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) =>
      (sortField === "rating" ? a.rating - b.rating : a.name.localeCompare(b.name)) * dir,
    );
  }, [abilities, q, champsOnly, champs, sortField, sortDir]);

  const { visible, sentinel, shown } = useInfinite(filtered, `${q}|${champsOnly}|${sortField}|${sortDir}`, 50);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${scopeCount} ${champsOnly ? "Champions" : ""} abilities…`}
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
        <span className="text-xs text-slate-500">{shown} / {filtered.length} shown</span>
      </div>

      {advOpen && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs">
          <label className="flex items-center gap-1.5 text-slate-400">
            Sort by
            <select value={sortField} onChange={(e) => setSortField(e.target.value as SortField)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100">
              <option value="">Default</option>
              <option value="name">Name</option>
              <option value="rating">Rating</option>
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
            <button onClick={() => { setSortField(""); setSortDir("asc"); }} className="rounded border border-slate-700 px-2 py-1 text-slate-400 hover:border-rose-500">Clear</button>
          )}
        </div>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {visible.map((a) => (
          <li key={a.name} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <Link
                href={`/database/ability/${encodeURIComponent(a.name)}`}
                className="font-semibold text-amber-400 hover:underline"
              >
                {a.name}
              </Link>
              {a.rating > 0 && <span className="text-xs text-slate-500">{a.rating}</span>}
            </div>
            <p className="mt-1 text-sm text-slate-300">{a.desc}</p>
          </li>
        ))}
      </ul>
      <span ref={sentinel as React.RefObject<HTMLSpanElement>} className="block h-px" />
    </div>
  );
}
