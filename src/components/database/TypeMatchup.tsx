"use client";

// Full 18×18 type chart plus a dual-type effectiveness calculator: pick an
// attacking move type and up to two defending types and read the multiplier.

import { useState } from "react";
import { POKEMON_TYPES, type PokemonType } from "@/domain/types/pokemon";
import { singleTypeMultiplier } from "@/domain/mechanics/typeChart";
import { typeEffectiveness } from "@/domain/mechanics/typeEffectiveness";
import { TypeBadge } from "@/components/ui";

function cellColor(m: number): string {
  if (m === 0) return "bg-slate-950 text-slate-600";
  if (m === 2) return "bg-emerald-700/70 text-white";
  if (m === 0.5) return "bg-rose-800/60 text-white";
  return "bg-slate-800/40 text-slate-500";
}
function cellText(m: number): string {
  if (m === 0) return "0";
  if (m === 2) return "2";
  if (m === 0.5) return "½";
  return "";
}

export function TypeMatchup() {
  const [atk, setAtk] = useState<PokemonType>("fire");
  const [d1, setD1] = useState<PokemonType>("grass");
  const [d2, setD2] = useState<PokemonType | "">("steel");

  const defenders = (d2 ? [d1, d2] : [d1]) as PokemonType[];
  const result = typeEffectiveness(atk, defenders);

  return (
    <div className="space-y-8">
      {/* Dual-type calculator */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Effectiveness calculator
        </h3>
        <div className="flex flex-wrap items-end gap-4 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Move type</span>
            <select
              value={atk}
              onChange={(e) => setAtk(e.target.value as PokemonType)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 capitalize"
            >
              {POKEMON_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <span className="pb-1 text-slate-600">vs</span>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Defender type 1</span>
            <select
              value={d1}
              onChange={(e) => setD1(e.target.value as PokemonType)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 capitalize"
            >
              {POKEMON_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Defender type 2</span>
            <select
              value={d2}
              onChange={(e) => setD2(e.target.value as PokemonType | "")}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 capitalize"
            >
              <option value="">(none)</option>
              {POKEMON_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2 pb-1">
            <span className="flex gap-1">
              <TypeBadge type={atk} />
              <span className="text-slate-600">→</span>
              {defenders.map((t) => <TypeBadge key={t} type={t} />)}
            </span>
            <span
              className={`rounded px-3 py-1 text-lg font-bold ${
                result.multiplier === 0
                  ? "bg-slate-800 text-slate-500"
                  : result.multiplier > 1
                    ? "bg-emerald-700/70 text-white"
                    : result.multiplier < 1
                      ? "bg-rose-800/70 text-white"
                      : "bg-slate-700 text-slate-200"
              }`}
            >
              ×{result.multiplier}
            </span>
            <span className="text-xs capitalize text-slate-400">{result.label.replace("-", " ")}</span>
          </div>
        </div>
      </div>

      {/* Full chart */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Type chart
        </h3>
        <p className="mb-3 text-xs text-slate-500">Row = attacking type, column = defending type.</p>
        <div className="overflow-x-auto">
          <table className="border-collapse text-center text-[10px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-slate-900/40 px-1 py-1 text-right text-slate-500">
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
                  <th className="sticky left-0 z-10 bg-slate-900/40 px-1 py-0.5 text-right font-normal capitalize text-slate-400">
                    {a}
                  </th>
                  {POKEMON_TYPES.map((d) => {
                    const m = singleTypeMultiplier(a, d);
                    return (
                      <td key={d} className={`h-6 w-6 border border-slate-950/60 ${cellColor(m)}`}>
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
    </div>
  );
}
