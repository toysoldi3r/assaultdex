// Transparent, factor-decomposed action scoring. Each factor is stored
// separately (spec: "Store each factor separately rather than only storing a
// final score"). Profiles supply weights only; they never change mechanics or
// probabilities.

export const SCORE_FACTORS = [
  "expectedDamage",
  "koProbability",
  "speedControl",
  "typeAdvantage",
] as const;

export type ScoreFactorName = (typeof SCORE_FACTORS)[number];

export interface ScoreFactor {
  name: ScoreFactorName;
  /** Raw underlying value (units depend on the factor). */
  raw: number;
  /** Normalized 0..1 contribution before weighting. */
  normalized: number;
  weight: number;
  /** normalized * weight. */
  contribution: number;
}

export interface ScoreBreakdown {
  factors: ScoreFactor[];
  /** Weighted sum of contributions, normalized to 0..1. */
  total: number;
}

export type ProfileName =
  | "balanced"
  | "safest"
  | "highestEv"
  | "maxDamage"
  | "longTerm"
  | "aggressive"
  | "conservative";

export type FactorWeights = Record<ScoreFactorName, number>;

/** Weight vectors per profile. Weights are relative and normalized at scoring. */
export const PROFILE_WEIGHTS: Record<ProfileName, FactorWeights> = {
  balanced: { expectedDamage: 1, koProbability: 1, speedControl: 1, typeAdvantage: 1 },
  safest: { expectedDamage: 0.5, koProbability: 0.75, speedControl: 2, typeAdvantage: 1 },
  highestEv: { expectedDamage: 2, koProbability: 1.5, speedControl: 0.75, typeAdvantage: 0.75 },
  maxDamage: { expectedDamage: 3, koProbability: 1.5, speedControl: 0.25, typeAdvantage: 0.5 },
  longTerm: { expectedDamage: 0.75, koProbability: 0.75, speedControl: 1.5, typeAdvantage: 2 },
  aggressive: { expectedDamage: 1.5, koProbability: 3, speedControl: 0.5, typeAdvantage: 0.75 },
  conservative: { expectedDamage: 0.75, koProbability: 1, speedControl: 2, typeAdvantage: 1.25 },
};

export const PROFILE_LABELS: Record<ProfileName, string> = {
  balanced: "Balanced",
  safest: "Safest",
  highestEv: "Highest expected value",
  maxDamage: "Maximum immediate damage",
  longTerm: "Best long-term position",
  aggressive: "Aggressive prediction",
  conservative: "Conservative tournament play",
};

/** Combine normalized factor values with a profile's weights. */
export function scoreFactors(
  normalized: Record<ScoreFactorName, { raw: number; normalized: number }>,
  weights: FactorWeights,
): ScoreBreakdown {
  const weightTotal = SCORE_FACTORS.reduce((a, f) => a + weights[f], 0) || 1;
  const factors: ScoreFactor[] = SCORE_FACTORS.map((name) => {
    const w = weights[name];
    const { raw, normalized: n } = normalized[name];
    return {
      name,
      raw,
      normalized: n,
      weight: w,
      contribution: (n * w) / weightTotal,
    };
  });
  const total = factors.reduce((a, f) => a + f.contribution, 0);
  return { factors, total: Math.round(total * 1000) / 1000 };
}
