"use client";

// Two-Pokémon battle calculator: pick both mons, their items/abilities/nature/
// EVs/stat-boosts and a move, then read the exact speed order, damage rolls, KO
// chance, and every modifier the engine multiplied in.

import { useMemo, useState } from "react";
import { PokeIcon } from "@/components/PokeIcon";
import { ItemIcon } from "@/components/ItemIcon";
import { TypeBadge } from "@/components/ui";
import { NATURES } from "@/data/fixtures/natures";
import {
  combatantFromRef,
  COMMON_ITEMS,
  type PokemonRef,
  type SlotForm,
} from "@/lib/choicedexBuild";
import { MoveSelectorPanel, type MoveRow } from "@/components/teams/MoveSelectorPanel";
import { calculateDamage } from "@/domain/mechanics/damage";
import { effectiveSpeed } from "@/domain/mechanics/speed";
import { DEFAULT_FIELD } from "@/domain/types/battle";
import { STAT_KEYS, STAT_LABELS, type StatKey } from "@/domain/types/pokemon";

const NATURE_NAMES = Object.keys(NATURES).sort();
const BOOST_KEYS: Exclude<StatKey, "hp">[] = ["atk", "def", "spa", "spd", "spe"];

function freshForm(species: string): SlotForm {
  return {
    species,
    hpPct: 100,
    status: "none",
    stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ability: "",
    item: "None",
    nature: "Serious",
    evs: {},
  };
}

function MonForm({
  label,
  refs,
  form,
  onChange,
}: {
  label: string;
  refs: PokemonRef[];
  form: SlotForm;
  onChange: (f: SlotForm) => void;
}) {
  const ref = refs.find((r) => r.slug === form.species);
  const totalEv = STAT_KEYS.reduce((s, k) => s + (form.evs?.[k] ?? 0), 0);
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        {ref && <PokeIcon species={ref.name} />}
        <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {/* LEFT: species, ability, item, nature, stages */}
        <div className="space-y-2">
          <select
            value={form.species}
            onChange={(e) => onChange({ ...freshForm(e.target.value) })}
            className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
          >
            {refs.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <select value={form.ability} onChange={(e) => onChange({ ...form, ability: e.target.value })}
              className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5" aria-label="Ability">
              <option value="">{ref?.abilities[0] ?? "Ability"}</option>
              {(ref?.abilities ?? []).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={form.item} onChange={(e) => onChange({ ...form, item: e.target.value })}
              className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5" aria-label="Item">
              {COMMON_ITEMS.map((it) => <option key={it} value={it}>{it}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <ItemIcon item={form.item} />
            <select value={form.nature} onChange={(e) => onChange({ ...form, nature: e.target.value })}
              className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5" aria-label="Nature">
              {NATURE_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-500">Stat stages</span>
            <div className="mt-1 grid grid-cols-5 gap-1 text-center text-[10px]">
              {BOOST_KEYS.map((k) => (
                <div key={k} className="flex flex-col items-center">
                  <span className="text-slate-500">{STAT_LABELS[k]}</span>
                  <div className="flex items-center gap-0.5">
                    <button type="button" aria-label={`Lower ${k}`}
                      onClick={() => onChange({ ...form, stages: { ...form.stages, [k]: Math.max(-6, form.stages[k] - 1) } })}
                      className="rounded bg-slate-800 px-1 leading-none hover:bg-slate-700">−</button>
                    <span className="w-4">{form.stages[k] > 0 ? `+${form.stages[k]}` : form.stages[k]}</span>
                    <button type="button" aria-label={`Raise ${k}`}
                      onClick={() => onChange({ ...form, stages: { ...form.stages, [k]: Math.min(6, form.stages[k] + 1) } })}
                      className="rounded bg-slate-800 px-1 leading-none hover:bg-slate-700">+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: EV sliders (IVs assumed 31) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] uppercase text-slate-500">
            <span>EVs</span>
            <span className={totalEv > 508 ? "text-rose-400" : "text-slate-500"}>{totalEv}/508 · IV 31</span>
          </div>
          {STAT_KEYS.map((k) => {
            const v = form.evs?.[k] ?? 0;
            return (
              <div key={k} className="flex items-center gap-2 text-[11px]">
                <span className="w-8 text-slate-400">{STAT_LABELS[k]}</span>
                <input
                  type="range" min={0} max={252} step={4} value={v}
                  onChange={(e) => onChange({ ...form, evs: { ...form.evs, [k]: Number(e.target.value) } })}
                  className="flex-1" aria-label={`${k} EV`}
                />
                <input
                  type="number" min={0} max={252} step={4} value={v}
                  onChange={(e) => onChange({ ...form, evs: { ...form.evs, [k]: Math.max(0, Math.min(252, Number(e.target.value))) } })}
                  className="w-12 rounded border border-slate-800 bg-slate-950 px-1 text-center"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function BattleCalculator({ pokemon }: { pokemon: PokemonRef[] }) {
  const refs = pokemon;
  const [a, setA] = useState<SlotForm>(() => freshForm(refs[0]?.slug ?? ""));
  const [b, setB] = useState<SlotForm>(() => freshForm(refs[1]?.slug ?? refs[0]?.slug ?? ""));
  const [moveName, setMoveName] = useState<string>("");
  const [movePicker, setMovePicker] = useState(false);

  const refA = refs.find((r) => r.slug === a.species);
  const refB = refs.find((r) => r.slug === b.species);

  const moveRows: MoveRow[] = (refA?.moves ?? []).map((m) => ({
    name: m.name,
    meta: { type: m.type, category: m.category, power: m.power, accuracy: m.accuracy, pp: null },
  }));

  const result = useMemo(() => {
    if (!refA || !refB) return null;
    const atk = combatantFromRef(refA, a);
    const def = combatantFromRef(refB, b);
    const move = refA.moves.find((m) => m.name === moveName) ?? refA.moves.find((m) => m.power);
    const dmg = move ? calculateDamage(atk, def, move, DEFAULT_FIELD) : null;
    const spA = effectiveSpeed(atk).effectiveSpeed;
    const spB = effectiveSpeed(def).effectiveSpeed;
    return { atk, def, move, dmg, spA, spB };
  }, [refA, refB, a, b, moveName]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <MonForm label="Attacker" refs={refs} form={a} onChange={setA} />
        <MonForm label="Defender" refs={refs} form={b} onChange={setB} />
      </div>

      {/* Move search (same table picker as the team builder), under the cards. */}
      <div className="text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Attacker&apos;s move</span>
          <button
            onClick={() => setMovePicker((o) => !o)}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-1 hover:border-amber-500"
          >
            {moveName || "(auto: first damaging)"}
          </button>
        </div>
        {movePicker && (
          <MoveSelectorPanel
            title={`${refA?.name ?? "Attacker"} moves`}
            rows={moveRows}
            value={moveName || null}
            onSelect={(v) => setMoveName(v ?? "")}
            onClose={() => setMovePicker(false)}
          />
        )}
      </div>

      {result && (
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm">
          {/* Speed */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold uppercase text-slate-400">Speed</span>
            <span className="flex items-center gap-1">
              {refA && <PokeIcon species={refA.name} />} {result.spA}
            </span>
            <span className="text-slate-500">vs</span>
            <span className="flex items-center gap-1">
              {refB && <PokeIcon species={refB.name} />} {result.spB}
            </span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-amber-300">
              {result.spA === result.spB
                ? "speed tie (50/50)"
                : result.spA > result.spB
                  ? `${refA?.name} is faster`
                  : `${refB?.name} is faster`}
            </span>
          </div>

          {/* Damage */}
          {result.move && result.dmg ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{result.move.name}</span>
                <TypeBadge type={result.move.type} />
                <span className="text-xs uppercase text-slate-500">{result.move.category}</span>
                <span className="text-xs text-slate-400">power {result.move.power ?? "-"}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-lg font-bold tabular-nums">
                  {result.dmg.minPercent}–{result.dmg.maxPercent}%
                </span>
                <span className="text-xs text-slate-400">
                  {result.dmg.minDamage}–{result.dmg.maxDamage} of {result.def.stats.hp} HP
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs">
                  OHKO {Math.round(result.dmg.ohkoProbability * 100)}% · 2HKO{" "}
                  {result.dmg.twoHitKoProbability === null ? "-" : Math.round(result.dmg.twoHitKoProbability * 100)}%
                </span>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase text-slate-500">Modifiers</p>
                <div className="flex flex-wrap gap-1">
                  {result.dmg.modifiers.map((mod, i) => (
                    <span key={i} className="rounded bg-slate-800/70 px-2 py-0.5 text-xs text-slate-300">
                      {mod.name} ×{mod.multiplier}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Attacker has no damaging move to calculate.</p>
          )}
        </div>
      )}
    </div>
  );
}
