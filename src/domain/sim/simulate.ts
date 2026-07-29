// Monte-Carlo battle simulation (Phase 8). Runs a policy vs a policy over random
// rolls and aggregates win probability, KO rate, variance, and a confidence
// interval. Reproducible by seed; cancellable via a callback. Provisional.

import type { AssumptionId } from "../mechanics/assumptions";
import type { BattleState } from "../types/battle";
import type { Policy } from "./policy";
import { activeCount, applyTurn, makeRng } from "./transition";

export type Outcome = "user" | "opponent" | "draw" | "timeout";

export interface SingleSim {
  outcome: Outcome;
  turns: number;
  userKOs: number; // opponent Pokémon the user knocked out
}

export function simulateBattle(
  state: BattleState,
  userPolicy: Policy,
  opponentPolicy: Policy,
  rng: () => number,
  maxTurns = 20,
): SingleSim {
  let current = state;
  let userKOs = 0;
  let turns = 0;

  const oppStart = activeCount(state, "opponent");

  for (let t = 0; t < maxTurns; t++) {
    if (activeCount(current, "user") === 0 || activeCount(current, "opponent") === 0) {
      break;
    }
    turns++;
    // Both policies choose from the SAME pre-turn state (no peeking).
    const userCombo = userPolicy(current, "user", rng);
    const oppCombo = opponentPolicy(current, "opponent", rng);
    const result = applyTurn(current, userCombo, oppCombo, rng);
    current = result.state;
  }

  const oppRemaining = activeCount(current, "opponent");
  userKOs = oppStart - oppRemaining;

  const userAlive = activeCount(current, "user") > 0;
  const oppAlive = activeCount(current, "opponent") > 0;

  let outcome: Outcome;
  if (userAlive && !oppAlive) outcome = "user";
  else if (!userAlive && oppAlive) outcome = "opponent";
  else if (!userAlive && !oppAlive) outcome = "draw";
  else outcome = "timeout";

  return { outcome, turns, userKOs };
}

export interface SimConfig {
  state: BattleState;
  userPolicy: Policy;
  opponentPolicy: Policy;
  runs: number;
  seed?: number;
  maxTurns?: number;
  /** Return true to stop early; the partial result is returned. */
  shouldCancel?: () => boolean;
}

export interface SimResult {
  completed: number;
  winProbability: number;
  /** 95% Wald confidence interval half-width for win probability. */
  winCiHalfWidth: number;
  lossProbability: number;
  drawOrTimeoutProbability: number;
  avgUserKOs: number;
  avgTurns: number;
  turnsVariance: number;
  /** Most common terminal outcomes with counts. */
  outcomeCounts: Record<Outcome, number>;
  cancelled: boolean;
  assumptions: AssumptionId[];
}

/** Running totals so a caller can accumulate simulations across chunks. */
export interface SimAccumulator {
  counts: Record<Outcome, number>;
  koSum: number;
  turnSum: number;
  turnSqSum: number;
  completed: number;
}

export function emptyAccumulator(): SimAccumulator {
  return {
    counts: { user: 0, opponent: 0, draw: 0, timeout: 0 },
    koSum: 0,
    turnSum: 0,
    turnSqSum: 0,
    completed: 0,
  };
}

export function accumulate(acc: SimAccumulator, sim: SingleSim): void {
  acc.counts[sim.outcome]++;
  acc.koSum += sim.userKOs;
  acc.turnSum += sim.turns;
  acc.turnSqSum += sim.turns * sim.turns;
  acc.completed++;
}

/** Turn running totals into the reported statistics. */
export function finalize(acc: SimAccumulator, cancelled = false): SimResult {
  const n = acc.completed || 1;
  const winProbability = acc.counts.user / n;
  const avgTurns = acc.turnSum / n;
  const turnsVariance = Math.max(0, acc.turnSqSum / n - avgTurns * avgTurns);
  const winCiHalfWidth =
    acc.completed > 0
      ? 1.96 * Math.sqrt((winProbability * (1 - winProbability)) / acc.completed)
      : 0;
  const round = (x: number) => Math.round(x * 1000) / 1000;

  return {
    completed: acc.completed,
    winProbability: round(winProbability),
    winCiHalfWidth: round(winCiHalfWidth),
    lossProbability: round(acc.counts.opponent / n),
    drawOrTimeoutProbability: round((acc.counts.draw + acc.counts.timeout) / n),
    avgUserKOs: round(acc.koSum / n),
    avgTurns: round(avgTurns),
    turnsVariance: round(turnsVariance),
    outcomeCounts: acc.counts,
    cancelled,
    assumptions: ["damageFormula", "statFormula", "speedOrder", "typeChart"],
  };
}

export function runSimulations(config: SimConfig): SimResult {
  const runs = Math.max(0, config.runs);
  const maxTurns = config.maxTurns ?? 20;
  const rng = makeRng(config.seed ?? 0x1234abcd);
  const acc = emptyAccumulator();
  let cancelled = false;

  for (let i = 0; i < runs; i++) {
    if (config.shouldCancel?.()) {
      cancelled = true;
      break;
    }
    accumulate(
      acc,
      simulateBattle(
        config.state,
        config.userPolicy,
        config.opponentPolicy,
        rng,
        maxTurns,
      ),
    );
  }

  return finalize(acc, cancelled);
}
