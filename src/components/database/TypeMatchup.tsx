"use client";

// Pick an attacking move type and read its effectiveness against every defender
// type combination in a grid (row = type 1, column = type 2; the diagonal is the
// single-type case). Plus the full single-type chart below.

import { useState } from "react";
import { POKEMON_TYPES, type PokemonType } from "@/domain/types/pokemon";
import { singleTypeMultiplier } from "@/domain/mechanics/typeChart";
import { TypeBadge } from "@/components/ui";

function cellColor(m: number): string {
  if (m === 0) return "bg-slate-950 text-slate-600";
  if (m >= 4) return "bg-emerald-500 text-black";
  if (m >= 2) return "bg-emerald-700/80 text-white";
  if (m > 0 && m < 0.5) return "bg-rose-900/80 text-white";
  if (m === 0.5) return "bg-rose-800/70 text-white";
  return "bg-slate-800/50 text-slate-400";
}
function cellText(m: number): string {
  if (m === 0) return "0";
  if (m === 0.25) return "¼";
  if (m === 0.5) return "½";
  if (m === 1) return "1";
  return `${m}`;
}

/** Effectiveness of an attacking type against a (t1,t2) defender; the diagonal
 *  (t1 === t2) is the single-type case, not the type squared. */
function effVs(atk: PokemonType, t1: PokemonType, t2: PokemonType): number {
  return t1 === t2
    ? singleTypeMultiplier(atk, t1)
    : singleTypeMultiplier(atk, t1) * singleTypeMultiplier(atk, t2);
}

export function TypeMatchup() {
  const [atk, setAtk] = useState<PokemonType>("fire");

  return (
    <div className="space-y-8">
      {/* Move-type effectiveness grid */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Move effectiveness
          </h3>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-xs text-slate-500">Move type</span>
            <select
              value={atk}
              onChange={(e) => setAtk(e.target.value as PokemonType)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 capitalize"
            >
              {POKEMON_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <TypeBadge type={atk} />
          <span className="text-xs text-slate-500">row = type 1, column = type 2</span>
        </div>
        <div className="overflow-x-auto">
          <table className="border-collapse text-center text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-slate-900/40 px-2 py-1 text-right text-[10px] text-slate-500">
                  1 \ 2
                </th>
                {POKEMON_TYPES.map((t) => (
                  <th key={t} className="px-1 py-1 font-normal capitalize text-slate-400" title={t}>
                    {t.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {POKEMON_TYPES.map((t1) => (
                <tr key={t1}>
                  <th className="sticky left-0 z-10 bg-slate-900/40 px-2 py-1 text-right font-normal capitalize text-slate-400">
                    {t1}
                  </th>
                  {POKEMON_TYPES.map((t2) => {
                    const m = effVs(atk, t1, t2);
                    return (
                      <td key={t2} className={`h-8 w-9 border border-slate-950/60 tabular-nums ${cellColor(m)}`}>
                        {cellText(m)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full single-type chart */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Type chart
        </h3>
        <p className="mb-3 text-xs text-slate-500">Row = attacking type, column = defending type.</p>
        <div className="overflow-x-auto">
          <table className="border-collapse text-center text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-slate-900/40 px-2 py-1 text-right text-[10px] text-slate-500">
                  atk \ def
                </th>
                {POKEMON_TYPES.map((t) => (
                  <th key={t} className="px-1 py-1 font-normal capitalize text-slate-400" title={t}>
                    {t.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {POKEMON_TYPES.map((a) => (
                <tr key={a}>
                  <th className="sticky left-0 z-10 bg-slate-900/40 px-2 py-1 text-right font-normal capitalize text-slate-400">
                    {a}
                  </th>
                  {POKEMON_TYPES.map((d) => {
                    const m = singleTypeMultiplier(a, d);
                    return (
                      <td key={d} className={`h-8 w-9 border border-slate-950/60 tabular-nums ${cellColor(m)}`}>
                        {m === 1 ? "" : cellText(m)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
