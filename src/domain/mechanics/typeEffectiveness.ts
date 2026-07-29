// Type-effectiveness calculations over single and dual types.
// Provisional (ASSUMPTIONS.typeChart).

import { POKEMON_TYPES, type PokemonType } from "../types/pokemon";
import { type AssumptionId } from "./assumptions";
import { singleTypeMultiplier } from "./typeChart";

export type DefenderTypes = readonly PokemonType[];

export interface EffectivenessResult {
  multiplier: number;
  /** Human label for the multiplier. */
  label:
    | "immune"
    | "double-resist"
    | "resist"
    | "neutral"
    | "super"
    | "double-super";
  assumptions: AssumptionId[];
}

function labelFor(multiplier: number): EffectivenessResult["label"] {
  if (multiplier === 0) return "immune";
  if (multiplier < 0.5) return "double-resist";
  if (multiplier < 1) return "resist";
  if (multiplier === 1) return "neutral";
  if (multiplier <= 2) return "super";
  return "double-super";
}

/** Combined multiplier of an attacking type against a (dual) defender. */
export function typeEffectiveness(
  attacking: PokemonType,
  defending: DefenderTypes,
): EffectivenessResult {
  const multiplier = defending.reduce(
    (acc, t) => acc * singleTypeMultiplier(attacking, t),
    1,
  );
  return { multiplier, label: labelFor(multiplier), assumptions: ["typeChart"] };
}

/** Per-attacking-type multipliers for a defender — used on Pokémon pages. */
export function defensiveChart(
  defending: DefenderTypes,
): Record<PokemonType, number> {
  const out = {} as Record<PokemonType, number>;
  for (const attacking of POKEMON_TYPES) {
    out[attacking] = typeEffectiveness(attacking, defending).multiplier;
  }
  return out;
}
