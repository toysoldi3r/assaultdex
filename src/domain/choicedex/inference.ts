// Opponent-inference distributions (Phase 6). Generic probability distributions
// over an unknown opponent property, updated from battle evidence. A possibility
// is removed only when confirmed evidence makes it impossible (spec).
//
// Priors here are uniform over the candidate set — NOT usage-based. Competitive
// usage priors are deferred until a verified data source exists
// (ASSUMPTIONS.spreadGridPrior).

import type { InformationTier } from "../types/battle";

export interface Evidence {
  description: string;
  /** Positive supports the possibility, negative contradicts it. */
  weight: number;
}

export interface Candidate<T> {
  value: T;
  prior: number;
  current: number;
  /** True only when confirmed evidence makes it impossible. */
  eliminated: boolean;
}

export interface PossibilityDistribution<T> {
  candidates: Candidate<T>[];
  supporting: Evidence[];
  contradictory: Evidence[];
  confidence: number;
  tier: InformationTier;
}

/** Uniform prior over the given values. */
export function createDistribution<T>(
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

/** @deprecated use createDistribution. Kept for the Phase 1 call site. */
export const withPriors = createDistribution;

/** Renormalize `current` over non-eliminated candidates and set confidence. */
function renormalize<T>(dist: PossibilityDistribution<T>): void {
  const live = dist.candidates.filter((c) => !c.eliminated);
  const total = live.reduce((a, c) => a + c.current, 0);
  if (total > 0) {
    for (const c of dist.candidates) {
      c.current = c.eliminated ? 0 : c.current / total;
    }
  }
  // Confidence rises as the live set shrinks and mass concentrates.
  const liveCount = live.length;
  const maxMass = live.reduce((m, c) => Math.max(m, c.current), 0);
  dist.confidence =
    liveCount <= 1 ? (liveCount === 1 ? 1 : 0) : Math.round(maxMass * 1000) / 1000;
}

/** Confirm the true value: all others become impossible. */
export function confirm<T>(
  dist: PossibilityDistribution<T>,
  isValue: (v: T) => boolean,
  evidence: string,
): PossibilityDistribution<T> {
  // If the confirmed value isn't a candidate, leave the distribution intact
  // rather than eliminating everything (a degenerate all-impossible state).
  if (!dist.candidates.some((c) => isValue(c.value))) {
    return dist;
  }
  for (const c of dist.candidates) {
    if (isValue(c.value)) {
      c.eliminated = false;
      c.current = 1;
    } else {
      c.eliminated = true;
      c.current = 0;
    }
  }
  dist.supporting.push({ description: evidence, weight: 1 });
  dist.tier = "confirmed";
  renormalize(dist);
  return dist;
}

/** Eliminate impossible candidates (confirmed evidence only). */
export function eliminate<T>(
  dist: PossibilityDistribution<T>,
  isImpossible: (v: T) => boolean,
  evidence: string,
): PossibilityDistribution<T> {
  let removed = 0;
  for (const c of dist.candidates) {
    if (!c.eliminated && isImpossible(c.value)) {
      c.eliminated = true;
      c.current = 0;
      removed++;
    }
  }
  if (removed > 0) {
    dist.contradictory.push({ description: evidence, weight: removed });
    if (dist.tier === "unknown") dist.tier = "inferred";
  }
  renormalize(dist);
  return dist;
}

/** Number of still-possible candidates. */
export function liveCandidates<T>(dist: PossibilityDistribution<T>): Candidate<T>[] {
  return dist.candidates.filter((c) => !c.eliminated);
}
