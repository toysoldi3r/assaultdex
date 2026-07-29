// Scenario sandbox (Phase 7). Copy a battle state, apply variable changes, and
// diff the resulting recommendation against the original. The original is never
// mutated (spec). Pure.

import type { BattleState } from "../types/battle";
import { recommend } from "./recommend";
import type { ProfileName } from "./scoring";

/** Deep copy so a scenario can be edited without touching the original. */
export function cloneState(state: BattleState): BattleState {
  return structuredClone(state);
}

/** Apply a mutation to a *copy* of the state, leaving the original untouched. */
export function withScenario(
  base: BattleState,
  mutate: (draft: BattleState) => void,
): BattleState {
  const draft = cloneState(base);
  mutate(draft);
  return draft;
}

export interface ScenarioSummary {
  topActions: string[];
  topScore: number;
  expectedDamage: number;
  koProbability: number;
  confidence: number;
}

export interface ScenarioComparison {
  baseline: ScenarioSummary;
  variant: ScenarioSummary;
  deltas: {
    score: number;
    expectedDamage: number;
    koProbability: number;
  };
}

function summarize(state: BattleState, profile: ProfileName): ScenarioSummary {
  const top = recommend(state, { profile, limit: 1 })[0];
  if (!top) {
    return {
      topActions: [],
      topScore: 0,
      expectedDamage: 0,
      koProbability: 0,
      confidence: 0,
    };
  }
  const expectedDamage = top.damage.reduce(
    (a, d) => a + d.damage.expectedPercent,
    0,
  );
  return {
    topActions: top.actionLines,
    topScore: top.breakdown.total,
    expectedDamage: Math.round(expectedDamage * 100) / 100,
    koProbability: top.koProbability,
    confidence: top.confidence,
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Compare the best recommendation of two states under one profile. */
export function compareScenarios(
  baseline: BattleState,
  variant: BattleState,
  profile: ProfileName = "balanced",
): ScenarioComparison {
  const b = summarize(baseline, profile);
  const v = summarize(variant, profile);
  return {
    baseline: b,
    variant: v,
    deltas: {
      score: round(v.topScore - b.topScore),
      expectedDamage: round(v.expectedDamage - b.expectedDamage),
      koProbability: round(v.koProbability - b.koProbability),
    },
  };
}
