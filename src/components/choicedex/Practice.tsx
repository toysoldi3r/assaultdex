"use client";

import { useMemo, useRef, useState } from "react";
import {
  legalCombinations,
  type Action,
  type ActionCombination,
} from "@/domain/mechanics/legalActions";
import { practicePolicy, type Difficulty } from "@/domain/sim/policy";
import { activeCount, applyTurn, makeRng } from "@/domain/sim/transition";
import type { BattleState, Combatant } from "@/domain/types/battle";
import {
  buildState,
  emptySide,
  type PokemonRef,
  type TurnForm,
} from "@/lib/choicedexBuild";

const DIFFICULTIES: Difficulty[] = ["basic", "standard", "competitive", "highVariance"];

function activeAt(state: BattleState, side: "user" | "opponent", slot: 0 | 1): Combatant | null {
  return (side === "user" ? state.user : state.opponent).active[slot];
}

function labelAction(state: BattleState, a: Action): string {
  const who = activeAt(state, a.side, a.slot)?.name ?? `Slot ${a.slot + 1}`;
  if (a.kind === "switch") return `${who}: switch ${a.switchTo}`;
  if (a.spread || a.targetSlot === null) return `${who}: ${a.moveName} → both`;
  const t = activeAt(state, a.targetSide, a.targetSlot)?.name ?? "target";
  return `${who}: ${a.moveName} → ${t}`;
}

function labelCombo(state: BattleState, combo: ActionCombination): string {
  return combo.map((a) => labelAction(state, a)).join("  &  ");
}

function hpLine(state: BattleState): string {
  const fmt = (c: Combatant | null) =>
    c ? `${c.name} ${Math.round((c.currentHp / c.stats.hp) * 100)}%${c.fainted ? " (KO)" : ""}` : "—";
  return `You: ${state.user.active.map(fmt).join(", ")} | Opp: ${state.opponent.active.map(fmt).join(", ")}`;
}

export function Practice({ pokemon }: { pokemon: PokemonRef[] }) {
  const refBySlug = useMemo(
    () => new Map(pokemon.map((p) => [p.slug, p])),
    [pokemon],
  );
  const opts = pokemon.map((p) => ({ slug: p.slug, name: p.name }));
  const d = (i: number) => opts[i % opts.length]?.slug ?? "";

  const [sel, setSel] = useState({ u1: d(0), u2: d(1), o1: d(2), o2: d(3) });
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [state, setState] = useState<BattleState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [choice, setChoice] = useState(0);
  const rngRef = useRef(makeRng(Date.now() >>> 0));

  const userCombos = state
    ? legalCombinations(state, "user").filter((c) => c.every((a) => a.kind === "move"))
    : [];
  const over =
    state !== null &&
    (activeCount(state, "user") === 0 || activeCount(state, "opponent") === 0);

  function start() {
    const form: TurnForm = {
      user: emptySide(sel.u1, sel.u2),
      opponent: emptySide(sel.o1, sel.o2),
      weather: "none",
      terrain: "none",
      trickRoom: false,
      gravity: false,
      note: "",
    };
    const s = buildState(form, refBySlug);
    rngRef.current = makeRng(Date.now() >>> 0);
    setState(s);
    setChoice(0);
    setLog(s ? [`Battle start. ${hpLine(s)}`] : []);
  }

  function resolve() {
    if (!state || over) return;
    const userCombo = userCombos[choice];
    if (!userCombo) return;
    // The AI selects from the pre-resolution state — it cannot see your choice.
    const oppCombo = practicePolicy(difficulty)(state, "opponent", rngRef.current);
    const oppLabel = labelCombo(state, oppCombo);
    const { state: next } = applyTurn(state, userCombo, oppCombo, rngRef.current);
    setState(next);
    setChoice(0);
    setLog((l) => [
      ...l,
      `Turn ${state.turn}: you ${labelCombo(state, userCombo)} · opponent ${oppLabel}`,
      hpLine(next),
    ]);
  }

  const set = (k: keyof typeof sel) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setSel((s) => ({ ...s, [k]: e.target.value }));

  const winner =
    over && state
      ? activeCount(state, "user") > 0
        ? "You win"
        : activeCount(state, "opponent") > 0
          ? "Opponent wins"
          : "Draw"
      : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Play the position out against the AssaultDex practice opponent. It picks
        its actions from the state before your move — it never reads your hidden
        choice. Provisional.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {(["u1", "u2", "o1", "o2"] as const).map((k) => (
          <label key={k} className="text-xs text-slate-400">
            {k.startsWith("u") ? "You" : "Opp"} slot {k[1]}
            <select
              value={sel[k]}
              onChange={set(k)}
              className="mt-0.5 block w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
            >
              {opts.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 text-xs text-slate-400">
        <label>
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="ml-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            {DIFFICULTIES.map((diff) => (
              <option key={diff} value={diff}>
                {diff}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={start}
          className="rounded bg-amber-500 px-3 py-1 font-semibold text-black hover:bg-amber-400"
        >
          {state ? "Restart" : "Start"}
        </button>
      </div>

      {state && !over && (
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <label className="text-slate-400">
            Your action
            <select
              value={choice}
              onChange={(e) => setChoice(Number(e.target.value))}
              className="ml-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
            >
              {userCombos.map((c, i) => (
                <option key={i} value={i}>
                  {labelCombo(state, c)}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={resolve}
            className="rounded border border-slate-600 px-3 py-1 hover:border-amber-500"
          >
            Resolve turn
          </button>
        </div>
      )}

      {winner && (
        <p className="text-sm font-semibold text-amber-400">{winner}.</p>
      )}

      {log.length > 0 && (
        <ol className="space-y-0.5 rounded border border-slate-800 p-3 text-xs text-slate-400">
          {log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
