// Opponent-inference TYPES only (Phase 1). Full Bayesian updating is Phase 6.
// The shapes exist so the battle state can carry inferred/unknown information
// honestly, without a working updater being claimed.

import type { InformationTier } from "../types/battle";

export interface Evidence {
  description: string;
  /** Positive supports the possibility, negative contradicts it. */
  weight: number;
}

/** A distribution over a single unknown property. */
export interface PossibilityDistribution<T> {
  candidates: {
    value: T;
    prior: number;
    current: number;
    /** True only when confirmed evidence makes it impossible. */
    eliminated: boolean;
  }[];
  supporting: Evidence[];
  contradictory: Evidence[];
  confidence: number;
  tier: InformationTier;
}

/**
 * Phase 1 placeholder: returns the prior unchanged. Real updates arrive in
 * Phase 6; this exists so callers can wire the type without fabricating an
 * update rule.
 */
export function withPriors<T>(
  values: T[],
  tier: InformationTier = "unknown",
): PossibilityDistribution<T> {
  const prior = values.length > 0 ? 1 / values.length : 0;
  return {
    candidates: values.map((value) => ({
      value,
      prior,
      current: prior,
      eliminated: false,
    })),
    supporting: [],
    contradictory: [],
    confidence: 0,
    tier,
  };
}
