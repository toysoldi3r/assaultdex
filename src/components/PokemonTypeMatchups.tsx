"use client";

// Type-matchups card with ability toggles. Defaults to the raw typing; tapping
// an ability that changes a matchup (Levitate, Thick Fat, Filter, ...) folds its
// effect into the chart and rings the cells that changed. Pure client math -
// defensiveChart / abilityMatchup carry no server or framework deps.

import { useMemo, useState } from "react";
import { Panel, TypeBadge } from "@/components/ui";
import {
  defensiveChartWithAbility,
  hasMatchupEffect,
} from "@/domain/mechanics/abilityMatchup";
import { defensiveChart } from "@/domain/mechanics/typeEffectiveness";
import { POKEMON_TYPES, type PokemonType } from "@/domain/types/pokemon";

function matchupCard(m: number): { text: string; card: string } {
  if (m === 0) return { text: "0×", card: "bg-black text-white" };
  if (m >= 2) return { text: `${m}×`, card: "bg-rose-600 text-white" };
  if (m < 1) return { text: `${m}×`, card: "bg-emerald-600 text-white" };
  return { text: "1×", card: "bg-raise text-t2" };
}

export function PokemonTypeMatchups({
  types,
  abilities,
}: {
  types: PokemonType[];
  abilities: string[];
}) {
  // Only abilities that actually change a matchup are worth a toggle.
  const toggleable = abilities.filter(hasMatchupEffect);
  const [active, setActive] = useState<string | null>(null);

  const base = useMemo(() => defensiveChart(types), [types]);
  const chart = useMemo(
    () => defensiveChartWithAbility(types, active),
    [types, active],
  );

  return (
    <Panel title="Type matchups">
      {toggleable.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[10px] uppercase tracking-wide text-slate-500">
            Ability
          </span>
          <button
            onClick={() => setActive(null)}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              active === null
                ? "bg-amber-500 text-black"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            None
          </button>
          {toggleable.map((a) => (
            <button
              key={a}
              onClick={() => setActive((cur) => (cur === a ? null : a))}
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                active === a
                  ? "bg-amber-500 text-black"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1 text-xs sm:grid-cols-3">
        {POKEMON_TYPES.map((t) => {
          const l = matchupCard(chart[t]);
          const changed = chart[t] !== base[t];
          return (
            <div
              key={t}
              className={`flex items-center justify-between gap-1 rounded px-2 py-1 ${l.card} ${
                changed ? "ring-2 ring-amber-400" : ""
              }`}
              title={changed ? `Base ${base[t]}× → ${chart[t]}×` : undefined}
            >
              <TypeBadge type={t} />
              <span className="font-semibold">{l.text}</span>
            </div>
          );
        })}
      </div>

      {toggleable.length > 0 && (
        <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-600">
          Toggle an ability to see how it changes the matchups (ringed cells).
        </p>
      )}
    </Panel>
  );
}
