"use client";

import { useState } from "react";
import { TypeBadge } from "@/components/ui";
import { PokeIcon } from "@/components/PokeIcon";
import { NATURES, natureByName } from "@/data/fixtures/natures";
import { calculateDamage } from "@/domain/mechanics/damage";
import { hazardEntry, hasHazards } from "@/domain/mechanics/hazards";
import type { Combatant, FieldState, SideConditions } from "@/domain/types/battle";
import { STAT_KEYS, type MoveFixture, type PokemonType, type StatKey } from "@/domain/types/pokemon";
import { itemOptions } from "@/lib/choicedexBuild";

const STAT_LABEL: Record<StatKey, string> = {
  hp: "HP", atk: "ATK", def: "DEF", spa: "SPA", spd: "SPD", spe: "SPE",
};
const NATURE_NAMES = Object.keys(NATURES).sort();

export interface MonPanelState {
  hpPct: number;
  status: import("@/domain/types/battle").StatusCondition;
  ability: string;
  item: string;
  itemUsed: boolean;
  nature: string;
  evs: Partial<Record<StatKey, number>>;
  stages: Record<Exclude<StatKey, "hp">, number>;
  crit: boolean;
  knownMoves: string[];
}

function koLabel(d: ReturnType<typeof calculateDamage>): { text: string; cls: string } {
  if (d.maxDamage <= 0) return { text: "-", cls: "text-slate-600" };
  if (d.ohkoProbability >= 1) return { text: "1HKO", cls: "text-emerald-400" };
  if (d.ohkoProbability > 0) return { text: `${Math.round(d.ohkoProbability * 100)}% 1HKO`, cls: "text-amber-400" };
  if ((d.twoHitKoProbability ?? 0) >= 1) return { text: "2HKO", cls: "text-emerald-400" };
  if ((d.twoHitKoProbability ?? 0) > 0) return { text: `${Math.round((d.twoHitKoProbability ?? 0) * 100)}% 2HKO`, cls: "text-amber-400" };
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
  lockedAbility,
  items,
  field,
  defenderConditions,
  ownConditions,
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
  /** Ability fixed by an active forme (Mega / Transform); locks the selector. */
  lockedAbility?: string;
  items: string[];
  field: FieldState;
  defenderConditions: SideConditions;
  /** This Pokémon's own side conditions (entry hazards it takes on switch-in). */
  ownConditions: SideConditions;
  state: MonPanelState;
  onPatch: (p: Partial<MonPanelState>) => void;
  foe?: boolean;
}) {
  const nature = natureByName(state.nature);
  const damaging = attacker.moves;
  // Which target the KO readout reflects; click a target icon to switch.
  const [tgt, setTgt] = useState(0);
  const activeTarget = Math.min(tgt, Math.max(0, targets.length - 1));

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
        <select value={lockedAbility ?? (state.ability || defaultAbility)} onChange={(e) => onPatch({ ability: e.target.value })}
          disabled={!!lockedAbility} title={lockedAbility ? "Forme ability (fixed)" : undefined}
          className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5 disabled:opacity-70" aria-label="Ability">
          {(lockedAbility && !abilities.includes(lockedAbility) ? [lockedAbility, ...abilities] : abilities).map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={state.nature} onChange={(e) => onPatch({ nature: e.target.value })}
          className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5" aria-label="Nature">
          {NATURE_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={state.item} onChange={(e) => onPatch({ item: e.target.value })}
          className={`rounded border border-slate-700 bg-slate-900 px-1 py-0.5 ${state.itemUsed ? "text-slate-500 line-through" : ""}`} aria-label="Item">
          {itemOptions(state.item, items).map((it) => <option key={it} value={it}>{it}</option>)}
        </select>
      </div>

      {/* Entry hazards on this Pokémon's own side */}
      {hasHazards(ownConditions) && (() => {
        const entry = hazardEntry(attacker, ownConditions, field);
        if (entry.notes.length === 0) {
          return (
            <p className="mb-2 text-[10px] text-slate-600">On switch-in: immune to hazards.</p>
          );
        }
        return (
          <div className="mb-2 flex items-center justify-between gap-2 rounded bg-slate-800/40 px-2 py-1 text-[10px] text-amber-300/90">
            <span>On switch-in: {entry.notes.join(", ")}</span>
            <button
              type="button"
              title="Apply the entry-hazard effects to this Pokémon"
              onClick={() =>
                onPatch({
                  hpPct: Math.max(0, Math.round(state.hpPct - entry.hpFraction * 100)),
                  ...(entry.status !== "none" ? { status: entry.status } : {}),
                  ...(entry.speedDrop > 0
                    ? { stages: { ...state.stages, spe: Math.max(-6, state.stages.spe - entry.speedDrop) } }
                    : {}),
                })
              }
              className="shrink-0 rounded border border-slate-600 px-1.5 py-0.5 text-slate-300 hover:border-amber-500"
            >
              apply
            </button>
          </div>
        );
      })()}

      {/* Moves / damage - one row per move against the SELECTED target. The "vs"
          column holds both target icons; click one to switch the KO readout. */}
      <div className="mb-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase text-slate-500">
              <th className="text-left font-normal">Move</th>
              <th className="text-right font-normal">Dmg</th>
              <th className="text-right font-normal">KO</th>
              <th className="text-right font-normal">Crit</th>
              <th className="text-center font-normal">vs</th>
            </tr>
          </thead>
          <tbody>
            {damaging.map((m: MoveFixture) => {
              const t = targets[activeTarget];
              const isDmg = m.category !== "status" && m.power !== null && !!t;
              const opt = { defenderConditions, spread: m.target !== "normal" };
              const d = isDmg
                ? calculateDamage(attacker, t!.combatant, m, field, { ...opt, crit: false })
                : null;
              const dc = isDmg
                ? calculateDamage(attacker, t!.combatant, m, field, { ...opt, crit: true })
                : null;
              const ko = d ? koLabel(d) : null;
              const koc = dc ? koLabel(dc) : null;
              const known = state.knownMoves.includes(m.name);
              const toggleKnown = () =>
                onPatch({
                  knownMoves: known
                    ? state.knownMoves.filter((x) => x !== m.name)
                    : [...state.knownMoves, m.name],
                });
              return (
                <tr key={m.name} className="border-t border-slate-800/60">
                  <td className="py-0.5 pr-2">
                    {foe ? (
                      <button
                        type="button"
                        onClick={toggleKnown}
                        title={known ? "Confirmed used - click to unmark" : "Mark as confirmed used"}
                        className={known ? "font-semibold text-amber-300" : "text-slate-300 hover:text-amber-300"}
                      >
                        {known ? "✓ " : "○ "}
                        {m.name}
                      </button>
                    ) : (
                      m.name
                    )}
                  </td>
                  <td className="py-0.5 pr-2 text-right tabular-nums text-slate-400">
                    {d ? `${d.minPercent}–${d.maxPercent}%` : "-"}
                  </td>
                  <td className={`py-0.5 text-right ${ko?.cls ?? ""}`}>{ko?.text ?? ""}</td>
                  <td className={`py-0.5 text-right ${koc?.cls ?? ""}`}>{koc?.text ?? ""}</td>
                  <td className="py-0.5 text-center">
                    <span className="inline-flex gap-0.5">
                      {targets.map((tt, ti) => (
                        <button
                          key={tt.name}
                          type="button"
                          onClick={() => setTgt(ti)}
                          title={`Show KO vs ${tt.name}`}
                          className={`rounded ${ti === activeTarget ? "ring-1 ring-amber-400" : "opacity-50 hover:opacity-100"}`}
                        >
                          <PokeIcon species={tt.name} />
                        </button>
                      ))}
                    </span>
                  </td>
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
            <td className="text-slate-700">-</td>
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
