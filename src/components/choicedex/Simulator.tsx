"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { recommend } from "@/domain/choicedex/recommend";
import {
  PROFILE_LABELS,
  type ProfileName,
} from "@/domain/choicedex/scoring";
import { greedyPolicy, practicePolicy, type Difficulty } from "@/domain/sim/policy";
import {
  accumulate,
  emptyAccumulator,
  finalize,
  simulateBattle,
  type SimResult,
} from "@/domain/sim/simulate";
import { makeRng } from "@/domain/sim/transition";
import {
  buildState,
  emptySide,
  type PokemonRef,
  type TurnForm,
} from "@/lib/choicedexBuild";

const PROFILES = Object.keys(PROFILE_LABELS) as ProfileName[];
const DIFFICULTIES: Difficulty[] = ["basic", "standard", "competitive", "highVariance"];
const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  basic: "Basic",
  standard: "Standard",
  competitive: "Competitive",
  highVariance: "High variance",
};

export function Simulator({ pokemon }: { pokemon: PokemonRef[] }) {
  const refBySlug = useMemo(
    () => new Map(pokemon.map((p) => [p.slug, p])),
    [pokemon],
  );
  const opts = pokemon.map((p) => ({ slug: p.slug, name: p.name }));
  const d = (i: number) => opts[i % opts.length]?.slug ?? "";

  const [sel, setSel] = useState({ u1: d(0), u2: d(1), o1: d(2), o2: d(3) });
  const [profile, setProfile] = useState<ProfileName>("aggressive");
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [runs, setRuns] = useState(500);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SimResult | null>(null);
  const cancelRef = useRef(false);
  const mountedRef = useRef(true);

  // Cancel any in-flight run and stop touching state after unmount.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelRef.current = true;
    };
  }, []);

  const formOf = (): TurnForm => ({
    user: emptySide(sel.u1, sel.u2),
    opponent: emptySide(sel.o1, sel.o2),
    weather: "none",
    terrain: "none",
    trickRoom: false,
    gravity: false,
    note: "",
  });

  // Fast deterministic recommendation, available before any simulation.
  const fastRec = useMemo(() => {
    const state = buildState(formOf(), refBySlug);
    return state ? (recommend(state, { profile, limit: 1 })[0] ?? null) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, profile, refBySlug]);

  async function run() {
    const state = buildState(formOf(), refBySlug);
    if (!state) return;
    setRunning(true);
    setProgress(0);
    cancelRef.current = false;
    const acc = emptyAccumulator();
    const rng = makeRng(0x1234abcd);
    const userPol = greedyPolicy(profile);
    const oppPol = practicePolicy(difficulty);
    const chunk = 50;
    for (let i = 0; i < runs; i += chunk) {
      if (cancelRef.current) break;
      for (let j = 0; j < chunk && i + j < runs; j++) {
        accumulate(acc, simulateBattle(state, userPol, oppPol, rng, 20));
      }
      if (!mountedRef.current) return;
      setProgress(acc.completed);
      setResult(finalize(acc, cancelRef.current));
      await new Promise((r) => setTimeout(r, 0));
    }
    if (!mountedRef.current) return;
    setResult(finalize(acc, cancelRef.current));
    setRunning(false);
  }

  const set = (k: keyof typeof sel) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setSel((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Monte-Carlo rollouts of the position: your greedy policy vs a practice
        opponent at the chosen difficulty, with random rolls and accuracy. A fast
        deterministic recommendation is shown first. Provisional.
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
          Your profile
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value as ProfileName)}
            className="ml-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            {PROFILES.map((p) => (
              <option key={p} value={p}>
                {PROFILE_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Opponent
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="ml-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            {DIFFICULTIES.map((diff) => (
              <option key={diff} value={diff}>
                {DIFFICULTY_LABELS[diff]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Runs
          <input
            type="number"
            min={50}
            max={5000}
            step={50}
            value={runs}
            onChange={(e) => setRuns(Number(e.target.value))}
            className="ml-1 w-20 rounded border border-slate-700 bg-slate-900 px-1 py-1 text-slate-100"
          />
        </label>
        {running ? (
          <button
            onClick={() => (cancelRef.current = true)}
            className="rounded border border-rose-700 px-3 py-1 text-rose-300 hover:border-rose-500"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={run}
            className="rounded bg-amber-500 px-3 py-1 font-semibold text-black hover:bg-amber-400"
          >
            Run simulations
          </button>
        )}
      </div>

      {fastRec && (
        <div className="rounded border border-slate-800 bg-slate-900/40 p-3 text-xs">
          <p className="font-semibold uppercase text-slate-500">
            Fast recommendation
          </p>
          <p className="mt-1 text-slate-300">{fastRec.actionLines.join("; ")}</p>
          <p className="text-slate-500">
            score {fastRec.breakdown.total.toFixed(3)} · {fastRec.expectedPosition}
          </p>
        </div>
      )}

      {running && (
        <div className="h-2 overflow-hidden rounded bg-slate-800">
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${(progress / runs) * 100}%` }}
          />
        </div>
      )}

      {result && result.completed > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-amber-400">
              Win {(result.winProbability * 100).toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500">
              ±{(result.winCiHalfWidth * 100).toFixed(1)}% (95% CI) ·{" "}
              {result.completed}/{runs} runs
              {result.cancelled ? " · cancelled" : ""}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-400 sm:grid-cols-3">
            <span>Loss {(result.lossProbability * 100).toFixed(1)}%</span>
            <span>
              Draw/timeout {(result.drawOrTimeoutProbability * 100).toFixed(1)}%
            </span>
            <span>Avg KOs {result.avgUserKOs}</span>
            <span>Avg turns {result.avgTurns}</span>
            <span>Turn variance {result.turnsVariance}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Outcomes — win {result.outcomeCounts.user}, loss{" "}
            {result.outcomeCounts.opponent}, draw {result.outcomeCounts.draw},
            timeout {result.outcomeCounts.timeout}.
          </p>
        </div>
      )}
    </div>
  );
}
