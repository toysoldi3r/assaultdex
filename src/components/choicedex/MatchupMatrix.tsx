"use client";

import { useMemo, useState } from "react";
import { buildMatchupMatrix } from "@/domain/choicedex/matchup";
import { DEFAULT_FIELD } from "@/domain/types/battle";
import {
  combatantFromRef,
  emptySlot,
  type PokemonRef,
} from "@/lib/choicedexBuild";

function toggle(list: string[], slug: string): string[] {
  return list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
}

function cellColor(pct: number, ohko: number): string {
  if (ohko >= 1) return "bg-rose-700/60";
  if (pct >= 50) return "bg-orange-700/40";
  if (pct >= 25) return "bg-amber-700/30";
  return "bg-slate-800/40";
}

export function MatchupMatrix({ pokemon }: { pokemon: PokemonRef[] }) {
  const refBySlug = useMemo(
    () => new Map(pokemon.map((p) => [p.slug, p])),
    [pokemon],
  );
  const [attackers, setAttackers] = useState<string[]>(
    pokemon.slice(0, 3).map((p) => p.slug),
  );
  const [defenders, setDefenders] = useState<string[]>(
    pokemon.slice(3, 6).map((p) => p.slug),
  );

  const matrix = useMemo(() => {
    const a = attackers
      .map((s) => refBySlug.get(s))
      .filter(Boolean)
      .map((r) => combatantFromRef(r!, emptySlot(r!.slug)));
    const d = defenders
      .map((s) => refBySlug.get(s))
      .filter(Boolean)
      .map((r) => combatantFromRef(r!, emptySlot(r!.slug)));
    if (a.length === 0 || d.length === 0) return null;
    return buildMatchupMatrix(a, d, DEFAULT_FIELD);
  }, [attackers, defenders, refBySlug]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Best single-target offense of each of your Pokémon (rows) into each
        opponent (columns): expected %, OHKO chance, and a ▲ when you outspeed.
        Provisional.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Picker
          title="Your Pokémon (rows)"
          options={pokemon}
          selected={attackers}
          onToggle={(s) => setAttackers((l) => toggle(l, s))}
        />
        <Picker
          title="Opponents (columns)"
          options={pokemon}
          selected={defenders}
          onToggle={(s) => setDefenders((l) => toggle(l, s))}
        />
      </div>

      {!matrix ? (
        <p className="text-sm text-slate-500">Select at least one on each side.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="p-1 text-left text-slate-500">atk ＼ def</th>
                {matrix.defenders.map((d) => (
                  <th key={d} className="p-1 text-left text-slate-300">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.cells.map((row, i) => (
                <tr key={matrix.attackers[i]}>
                  <th className="p-1 text-left text-slate-300">
                    {matrix.attackers[i]}
                  </th>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`p-1 ${cellColor(cell.expectedPercent, cell.ohkoProbability)}`}
                      title={cell.bestMove ?? "no damaging move"}
                    >
                      <div className="font-mono text-slate-100">
                        {cell.expectedPercent}%{" "}
                        {cell.outspeeds ? "▲" : "▽"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {cell.bestMove ?? "—"}
                        {cell.ohkoProbability > 0
                          ? ` · OHKO ${(cell.ohkoProbability * 100).toFixed(0)}%`
                          : ""}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Picker({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: PokemonRef[];
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-1 text-sm">
        {options.map((p) => (
          <label key={p.slug} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.includes(p.slug)}
              onChange={() => onToggle(p.slug)}
            />
            {p.name}
          </label>
        ))}
      </div>
    </section>
  );
}
