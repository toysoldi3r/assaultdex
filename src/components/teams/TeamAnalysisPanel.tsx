"use client";

// Collapsible team-analysis card. Type icons (not words), Pokémon icon + name,
// speed tiers as bars + numbers, and explicit weather / speed control listing
// the exact ability or move responsible.

import { PokeIcon } from "@/components/PokeIcon";
import { TypeBadge } from "@/components/ui";
import { ProvisionalTag } from "@/components/ui";
import { statColor } from "@/domain/mechanics/statColor";
import type { TeamAnalysis } from "@/domain/team/analysis";
import type { PokemonType } from "@/domain/types/pokemon";

const WEATHER_LABEL: Record<string, string> = {
  sun: "Sun", rain: "Rain", sand: "Sandstorm", snow: "Snow",
};

export function TeamAnalysisPanel({ analysis }: { analysis: TeamAnalysis }) {
  const maxSpeed = Math.max(1, ...analysis.speedTiers.map((s) => s.speed));

  return (
    <details open className="rounded-lg border border-slate-800 bg-slate-900/40">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Team analysis
        <ProvisionalTag />
      </summary>

      <div className="grid gap-4 border-t border-slate-800 p-4 md:grid-cols-2">
        {/* Defensive weaknesses */}
        <div>
          <h3 className="text-xs font-semibold uppercase text-slate-500">Defensive weaknesses</h3>
          <ul className="mt-1 space-y-1 text-xs">
            {analysis.weaknesses.slice(0, 10).map((w) => (
              <li key={w.type} className="flex items-center gap-2">
                <TypeBadge type={w.type as PokemonType} />
                <span className={w.shared ? "font-semibold text-rose-300" : "text-slate-400"}>
                  ×{w.members.length}{w.shared ? " (shared)" : ""}
                </span>
                <span className="flex flex-wrap gap-0.5">
                  {w.members.map((m) => (
                    <span key={m} title={m}><PokeIcon species={m} /></span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Speed tiers as bars */}
        <div>
          <h3 className="text-xs font-semibold uppercase text-slate-500">Speed tiers</h3>
          <ul className="mt-1 space-y-1">
            {analysis.speedTiers.map((s) => (
              <li key={s.name} className="flex items-center gap-2 text-xs">
                <span className="flex w-28 items-center gap-1 truncate">
                  <PokeIcon species={s.name} />
                  <span className="truncate">{s.name}</span>
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
                  <span
                    className="block h-full"
                    style={{ width: `${(s.speed / maxSpeed) * 100}%`, backgroundColor: statColor(s.speed) }}
                  />
                </span>
                <span className="w-8 text-right tabular-nums text-slate-400">{s.speed}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weather control */}
        <div>
          <h3 className="text-xs font-semibold uppercase text-slate-500">Weather control</h3>
          {analysis.weatherControl.missing ? (
            <p className="mt-1 text-xs text-slate-500">None detected.</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-xs text-slate-300">
              {analysis.weatherControl.setters.map((w, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <PokeIcon species={w.member} />
                  <span className="font-medium">{WEATHER_LABEL[w.weather] ?? w.weather}</span>
                  <span className="text-slate-500">via {w.kind}</span>
                  <span className="text-amber-300">{w.source}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Speed control */}
        <div>
          <h3 className="text-xs font-semibold uppercase text-slate-500">Speed control</h3>
          {analysis.speedControl.missing ? (
            <p className="mt-1 text-xs text-slate-500">None detected (no priority or speed-control moves).</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-xs text-slate-300">
              {analysis.speedControl.controlMoves.map((c, i) => (
                <li key={`c${i}`} className="flex items-center gap-1.5">
                  <PokeIcon species={c.member} />
                  <span className="text-amber-300">{c.move}</span>
                </li>
              ))}
              {analysis.speedControl.priorityMoves.map((p, i) => (
                <li key={`p${i}`} className="flex items-center gap-1.5">
                  <PokeIcon species={p.member} />
                  <span className="text-sky-300">{p.move}</span>
                  <span className="text-slate-500">(priority)</span>
                </li>
              ))}
            </ul>
          )}
          {analysis.dependence.note && (
            <p className="mt-2 text-xs text-amber-300">{analysis.dependence.note}</p>
          )}
        </div>
      </div>
    </details>
  );
}
