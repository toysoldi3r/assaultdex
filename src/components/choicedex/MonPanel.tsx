"use client";

import { useState } from "react";
import { TypeBadge } from "@/components/ui";
import { NATURES, natureByName } from "@/data/fixtures/natures";
import { calculateDamage } from "@/domain/mechanics/damage";
import type { Combatant, FieldState, SideConditions } from "@/domain/types/battle";
import { STAT_KEYS, type MoveFixture, type PokemonType, type StatKey } from "@/domain/types/pokemon";
import { COMMON_ITEMS } from "@/lib/choicedexBuild";

const STAT_LABEL: Record<StatKey, string> = {
  hp: "HP", atk: "ATK", def: "DEF", spa: "SPA", spd: "SPD", spe: "SPE",
};
const NATURE_NAMES = Object.keys(NATURES).sort();

export interface MonPanelState {
  hpPct: number;
  ability: string;
  item: string;
  itemUsed: boolean;
  nature: string;
  evs: Partial<Record<StatKey, number>>;
  stages: Record<Exclude<StatKey, "hp">, number>;
  crit: boolean;
}

function koLabel(d: ReturnType<typeof calculateDamage>): { text: string; cls: string } {
  if (d.maxDamage <= 0) return { text: "—", cls: "text-slate-600" };
  if (d.ohkoProbability >= 1) return { text: "1HKO", cls: "text-emerald-400" };
  if (d.ohkoProbability > 0) return { text: `${Math.round(d.ohkoProbability * 100)}% 1HKO`, cls: "text-amber-400" };
  if (d.twoHitKoProbability >= 1) return { text: "2HKO", cls: "text-emerald-400" };
  if (d.twoHitKoProbability > 0) return { text: `${Math.round(d.twoHitKoProbability * 100)}% 2HKO`, cls: "text-amber-400" };
  const hits = Math.max(2, Math.ceil(100 / (d.maxPercent || 1)));
  return { text: `${hits}HKO`, cls: "text-slate-500" };
}

/**
 * Showdex-style detail card for one active Pokémon: HP, ability/nature/item,
 * per-move damage ranges + KO chance against a chosen target, and a full
 * BASE / EV / computed / STAGE stat table with the nature highlighted.
 */
export function MonPanel({
  name,
  types,
  baseStats,
  attacker,
  targets,
  abilities,
  defaultAbility,
  field,
  defenderConditions,
  state,
  onPatch,
  foe,
}: {
  name: string;
  types: PokemonType[];
  baseStats: Record<StatKey, number>;
  /** The built combatant (computed stats, moves) for this Pokémon. */
  attacker: Combatant;
  /** Opposing active Pokémon this one can hit. */
  targets: { name: string; combatant: Combatant }[];
  abilities: string[];
  defaultAbility: string;
  field: FieldState;
  defenderConditions: SideConditions;
  state: MonPanelState;
  onPatch: (p: Partial<MonPanelState>) => void;
  foe?: boolean;
}) {
  const [targetIdx, setTargetIdx] = useState(0);
  const target = targets[Math.min(targetIdx, targets.length - 1)];
  const nature = natureByName(state.nature);
  const damaging = attacker.moves;

  const natureCls = (k: StatKey): string => {
    if (k === "hp" || nature.boosted === nature.lowered) return "text-slate-400";
    if (k === nature.boosted) return "text-rose-400";
    if (k === nature.lowered) return "text-sky-400";
    return "text-slate-400";
  };
  const natureMark = (k: StatKey): string =>
    k === "hp" || nature.boosted === nature.lowered ? "" : k === nature.boosted ? "+" : k === nature.lowered ? "−" : "";

  return (
    <div className={`rounded-lg border p-3 ${foe ? "border-rose-900/50" : "border-emerald-900/50"} bg-slate-900/50`}>
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{name}</span>
          <span className="flex gap-1">{types.map((t) => <TypeBadge key={t} type={t} />)}</span>
        </div>
        <span className="text-xs tabular-nums text-slate-400">{state.hpPct}%</span>
      </div>
      <input
        type="range" min={0} max={100} value={state.hpPct}
        onChange={(e) => onPatch({ hpPct: Number(e.target.value) })}
        className="mb-2 w-full"
        aria-label="HP percent"
      />

      {/* Ability / Nature / Item */}
      <div className="mb-2 grid grid-cols-3 gap-1 text-xs">
        <select value={state.ability || defaultAbility} onChange={(e) => onPatch({ ability: e.target.value })}
          className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5" aria-label="Ability">
          {abilities.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={state.nature} onChange={(e) => onPatch({ nature: e.target.value })}
          className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5" aria-label="Nature">
          {NATURE_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={state.item} onChange={(e) => onPatch({ item: e.target.value })}
          className={`rounded border border-slate-700 bg-slate-900 px-1 py-0.5 ${state.itemUsed ? "text-slate-500 line-through" : ""}`} aria-label="Item">
          {COMMON_ITEMS.map((it) => <option key={it} value={it}>{it}</option>)}
        </select>
      </div>

      {/* Moves / damage */}
      <div className="mb-2">
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase text-slate-500">
          <span>Moves · dmg</span>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 normal-case">
              <input type="checkbox" checked={state.crit} onChange={(e) => onPatch({ crit: e.target.checked })} /> crit
            </label>
            {targets.length > 1 && (
              <select value={targetIdx} onChange={(e) => setTargetIdx(Number(e.target.value))}
                className="rounded border border-slate-700 bg-slate-900 px-1 text-slate-300">
                {targets.map((t, i) => <option key={i} value={i}>vs {t.name}</option>)}
              </select>
            )}
          </div>
        </div>
        <table className="w-full text-xs">
          <tbody>
            {damaging.map((m: MoveFixture) => {
              const d = target
                ? calculateDamage(attacker, target.combatant, m, field, {
                    crit: state.crit,
                    defenderConditions,
                    spread: m.target !== "normal",
                  })
                : null;
              const isDmg = m.category !== "status" && m.power !== null;
              const ko = d && isDmg ? koLabel(d) : null;
              return (
                <tr key={m.name} className="border-t border-slate-800/60">
                  <td className="py-0.5 pr-2">{m.name}</td>
                  <td className="py-0.5 pr-2 text-right tabular-nums text-slate-400">
                    {d && isDmg ? `${d.minPercent} – ${d.maxPercent}%` : "—"}
                  </td>
                  <td className={`py-0.5 text-right ${ko?.cls ?? ""}`}>{ko?.text ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stat table: BASE / EV / computed / STAGE */}
      <table className="w-full text-center text-[11px]">
        <thead>
          <tr className="text-[10px] uppercase text-slate-500">
            <th className="text-left font-normal"> </th>
            {STAT_KEYS.map((k) => (
              <th key={k} className={`font-semibold ${natureCls(k)}`}>{natureMark(k)}{STAT_LABEL[k]}</th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular-nums">
          <tr>
            <td className="text-left text-slate-500">BASE</td>
            {STAT_KEYS.map((k) => <td key={k} className="text-slate-400">{baseStats[k]}</td>)}
          </tr>
          <tr>
            <td className="text-left text-slate-500">EV</td>
            {STAT_KEYS.map((k) => (
              <td key={k}>
                <input
                  type="number" min={0} max={252} step={4}
                  value={state.evs[k] ?? 0}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(252, Number(e.target.value)));
                    onPatch({ evs: { ...state.evs, [k]: v } });
                  }}
                  className="w-10 rounded border border-slate-800 bg-slate-950 px-0.5 py-0 text-center"
                />
              </td>
            ))}
          </tr>
          <tr>
            <td className="text-left text-slate-500">=</td>
            {STAT_KEYS.map((k) => <td key={k} className="font-semibold text-slate-200">{attacker.stats[k]}</td>)}
          </tr>
          <tr>
            <td className="text-left text-slate-500">STAGE</td>
            <td className="text-slate-700">—</td>
            {(["atk", "def", "spa", "spd", "spe"] as const).map((k) => (
              <td key={k}>
                <div className="flex items-center justify-center gap-0.5">
                  <button type="button" onClick={() => onPatch({ stages: { ...state.stages, [k]: Math.max(-6, state.stages[k] - 1) } })}
                    className="rounded bg-slate-800 px-1 leading-none hover:bg-slate-700" aria-label={`Lower ${k}`}>−</button>
                  <span className="w-4 text-center">{state.stages[k] > 0 ? `+${state.stages[k]}` : state.stages[k]}</span>
                  <button type="button" onClick={() => onPatch({ stages: { ...state.stages, [k]: Math.min(6, state.stages[k] + 1) } })}
                    className="rounded bg-slate-800 px-1 leading-none hover:bg-slate-700" aria-label={`Raise ${k}`}>+</button>
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
