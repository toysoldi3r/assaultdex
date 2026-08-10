// Action-selection policies for simulations and the practice opponent (Phase 8).
//
// Every policy takes ONLY the current battle state (and an RNG) - it cannot see
// the opponent's pending choice, so the practice opponent structurally never
// reads the user's hidden action before selecting its own (spec).

import { evaluateCombination } from "../choicedex/recommend";
import type { ProfileName } from "../choicedex/scoring";
import {
  legalCombinations,
  type ActionCombination,
} from "../mechanics/legalActions";
import type { BattleState } from "../types/battle";

export type Side = "user" | "opponent";
export type Policy = (state: BattleState, side: Side, rng: () => number) => ActionCombination;

export type Difficulty = "basic" | "standard" | "competitive" | "highVariance";

function moveCombos(state: BattleState, side: Side): ActionCombination[] {
  return legalCombinations(state, side).filter((c) =>
    c.every((a) => a.kind === "move"),
  );
}

function scored(
  state: BattleState,
  side: Side,
  profile: ProfileName,
): { combo: ActionCombination; score: number }[] {
  return moveCombos(state, side)
    .map((combo) => ({
      combo,
      score: evaluateCombination(state, combo, profile).breakdown.total,
    }))
    .sort((a, b) => b.score - a.score);
}

/** Always pick the highest-scoring legal move combination. */
export function greedyPolicy(profile: ProfileName = "balanced"): Policy {
  return (state, side) => scored(state, side, profile)[0]?.combo ?? [];
}

/** Uniformly random legal move combination. */
export const randomPolicy: Policy = (state, side, rng) => {
  const combos = moveCombos(state, side);
  if (combos.length === 0) return [];
  return combos[Math.floor(rng() * combos.length)]!;
};

/** Practice opponent AI at a chosen difficulty. */
export function practicePolicy(
  difficulty: Difficulty,
  profile: ProfileName = "balanced",
): Policy {
  return (state, side, rng) => {
    const ranked = scored(state, side, profile);
    if (ranked.length === 0) return [];

    switch (difficulty) {
      case "basic":
        // Mostly random, occasionally the best line.
        return rng() < 0.25 ? ranked[0]!.combo : randomPolicy(state, side, rng);
      case "standard":
        // Usually best, sometimes a random legal line.
        return rng() < 0.8 ? ranked[0]!.combo : randomPolicy(state, side, rng);
      case "competitive":
        return ranked[0]!.combo;
      case "highVariance": {
        // Weighted-random among the top few by score.
        const top = ranked.slice(0, 3);
        const total = top.reduce((a, r) => a + Math.max(0.01, r.score), 0);
        let x = rng() * total;
        for (const r of top) {
          x -= Math.max(0.01, r.score);
          if (x <= 0) return r.combo;
        }
        return top[0]!.combo;
      }
    }
  };
}
