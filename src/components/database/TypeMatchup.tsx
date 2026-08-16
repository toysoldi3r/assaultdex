"use client";

// Pick an attacking move type and read its effectiveness against every defender
// type combination in a grid (row = type 1, column = type 2; the diagonal is the
// single-type case). Plus the full single-type chart below. Headers are coloured
// by type; hovering a cell highlights its row + column, and a click locks that
// highlight (one locked cell at a time).

import { useState } from "react";
import { POKEMON_TYPES, type PokemonType } from "@/domain/types/pokemon";
import { singleTypeMultiplier } from "@/domain/mechanics/typeChart";
import { TypeBadge, TYPE_HEX } from "@/components/ui";

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

function effVs(atk: PokemonType, t1: PokemonType, t2: PokemonType): number {
  return t1 === t2
    ? singleTypeMultiplier(atk, t1)
    : singleTypeMultiplier(atk, t1) * singleTypeMultiplier(atk, t2);
}

/** A coloured type header/label chip. */
function TypeHead({ t, abbr, lit }: { t: PokemonType; abbr?: boolean; lit?: boolean }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase capitalize text-white ${lit ? "ring-2 ring-white" : ""}`}
      style={{ background: TYPE_HEX[t] }}
      title={t}
    >
      {abbr ? t.slice(0, 3) : t}
    </span>
  );
}

/** Effectiveness matrix with coloured headers + row/column hover-and-lock. */
function Chart({
  rowLabel,
  colLabel,
  hideOnes,
  value,
  tip,
}: {
  rowLabel: string;
  colLabel: string;
  hideOnes?: boolean;
  value: (row: PokemonType, col: PokemonType) => number;
  /** Cell tooltip; row/col meaning differs per chart, so the caller supplies it. */
  tip: (row: PokemonType, col: PokemonType, m: number) => string;
}) {
  // The highlighted cross is the locked cell if any, else the hovered one.
  const [hover, setHover] = useState<{ r: PokemonType; c: PokemonType } | null>(null);
  const [lock, setLock] = useState<{ r: PokemonType; c: PokemonType } | null>(null);
  const active = lock ?? hover;

  return (
    <div className="overflow-x-auto" onMouseLeave={() => setHover(null)}>
      <table className="border-collapse text-center text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-slate-900/40 px-2 py-1 text-right text-[10px] text-slate-500">
              {rowLabel} \ {colLabel}
            </th>
            {POKEMON_TYPES.map((t) => (
              <th key={t} className="px-1 py-1">
                <TypeHead t={t} abbr lit={!!active && active.c === t} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {POKEMON_TYPES.map((a) => (
            <tr key={a}>
              <th className="sticky left-0 z-10 bg-slate-900/40 px-2 py-1 text-right font-normal">
                <TypeHead t={a} lit={!!active && active.r === a} />
              </th>
              {POKEMON_TYPES.map((d) => {
                const m = value(a, d);
                const cross = !!active && (active.r === a || active.c === d);
                const exact = !!active && active.r === a && active.c === d;
                return (
                  <td
                    key={d}
                    onMouseEnter={() => setHover({ r: a, c: d })}
                    onClick={() => setLock((l) => (l && l.r === a && l.c === d ? null : { r: a, c: d }))}
                    className={`h-8 w-9 cursor-pointer border border-slate-950/60 tabular-nums ${cellColor(m)} ${
                      cross ? "brightness-125" : active ? "brightness-90" : ""
                    } ${exact ? "outline outline-2 -outline-offset-2 outline-white" : ""}`}
                    title={tip(a, d, m)}
                  >
                    {hideOnes && m === 1 ? "" : cellText(m)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TypeMatchup() {
  const [atk, setAtk] = useState<PokemonType>("fire");

  return (
    <div className="space-y-8">
      {/* Full single-type chart */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">Type chart</h3>
        <p className="mb-3 text-xs text-slate-500">
          Row = attacking type, column = defending type. Hover to highlight a row + column; click a cell to lock it.
        </p>
        <Chart
          rowLabel="atk" colLabel="def" hideOnes
          value={(a, d) => singleTypeMultiplier(a, d)}
          tip={(a, d, m) => `${a} → ${d}: ${cellText(m)}×`}
        />
      </div>

      {/* Move-type effectiveness grid */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Move effectiveness</h3>
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
        <Chart
          rowLabel="1" colLabel="2"
          value={(t1, t2) => effVs(atk, t1, t2)}
          tip={(t1, t2, m) => `${atk} → ${t1}${t1 === t2 ? "" : "/" + t2}: ${cellText(m)}×`}
        />
      </div>
    </div>
  );
}
