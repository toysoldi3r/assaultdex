"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DbAbility } from "@/data/dexDatabase";

export function AbilitiesTable({
  abilities,
  championsAbilities = [],
}: {
  abilities: DbAbility[];
  championsAbilities?: string[];
}) {
  const [q, setQ] = useState("");
  const [champsOnly, setChampsOnly] = useState(true);
  const [advOpen, setAdvOpen] = useState(false);
  // Advanced filters.
  const [minRating, setMinRating] = useState(0);
  const [modeledOnly, setModeledOnly] = useState(false);
  const champs = useMemo(() => new Set(championsAbilities), [championsAbilities]);

  const advCount = (minRating > 0 ? 1 : 0) + (modeledOnly ? 1 : 0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return abilities.filter(
      (a) =>
        (!champsOnly || champs.has(a.name)) &&
        (a.rating >= minRating) &&
        (!modeledOnly || !!a.calc || !!a.interaction) &&
        (!needle ||
          a.name.toLowerCase().includes(needle) ||
          a.desc.toLowerCase().includes(needle)),
    );
  }, [abilities, q, champsOnly, champs, minRating, modeledOnly]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${abilities.length} abilities…`}
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
            Min rating
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
            >
              <option value={0}>Any</option>
              <option value={1}>1+</option>
              <option value={2}>2+</option>
              <option value={3}>3+</option>
              <option value={4}>4+</option>
              <option value={5}>5 (top)</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-slate-300">
            <input type="checkbox" checked={modeledOnly} onChange={(e) => setModeledOnly(e.target.checked)} />
            Only modeled (has calc / interaction note)
          </label>
          {advCount > 0 && (
            <button
              onClick={() => { setMinRating(0); setModeledOnly(false); }}
              className="rounded border border-slate-700 px-2 py-1 text-slate-400 hover:border-rose-500"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {filtered.map((a) => (
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
    </div>
  );
}
