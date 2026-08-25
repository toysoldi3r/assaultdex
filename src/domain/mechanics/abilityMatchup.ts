// Defensive type-matchup effects of abilities, for the Pokédex "Type matchups"
// card. Pure and display-only: given an ability, returns how it changes the
// per-type damage multiplier a defender takes, so the page can let the user
// toggle an ability and see the chart update.
//
// Only abilities whose effect is TYPE-based belong here (immunities, type
// resistances/weaknesses, super-effective dampeners). Abilities that key off
// category/status/HP (Fur Coat, Multiscale, ...) do not change a *type* matchup
// and are intentionally omitted - abilityMatchup returns null for them, so the
// page shows no toggle. Mirrors the battle engine's abilities.ts data.

import type { PokemonType } from "../types/pokemon";
import { defensiveChart } from "./typeEffectiveness";

export interface AbilityMatchup {
  /** Per-attacking-type multiplicative factor (0 = immune) applied on top of
   *  the type chart. */
  factors: Partial<Record<PokemonType, number>>;
  /** Factor applied to every type the base chart makes super-effective
   *  (Filter / Solid Rock / Prism Armor). */
  superEffective?: number;
  /** Wonder Guard: only super-effective hits land; everything else becomes 0. */
  onlySuperEffective?: boolean;
}

const IMMUNITY: Record<string, PokemonType> = {
  Levitate: "ground",
  "Earth Eater": "ground",
  "Flash Fire": "fire",
  "Well-Baked Body": "fire",
  "Water Absorb": "water",
  "Storm Drain": "water",
  "Dry Skin": "water",
  "Volt Absorb": "electric",
  "Lightning Rod": "electric",
  "Motor Drive": "electric",
  "Sap Sipper": "grass",
};

const ABILITY_MATCHUPS: Record<string, AbilityMatchup> = {
  "Thick Fat": { factors: { fire: 0.5, ice: 0.5 } },
  Heatproof: { factors: { fire: 0.5 } },
  "Water Bubble": { factors: { fire: 0.5 } },
  "Purifying Salt": { factors: { ghost: 0.5 } },
  // Dry Skin: immune to Water (below), extra weak to Fire.
  "Dry Skin": { factors: { water: 0, fire: 1.25 } },
  // Fluffy doubles Fire damage (its contact halving is not a type effect).
  Fluffy: { factors: { fire: 2 } },
  Filter: { factors: {}, superEffective: 0.75 },
  "Solid Rock": { factors: {}, superEffective: 0.75 },
  "Prism Armor": { factors: {}, superEffective: 0.75 },
  "Wonder Guard": { factors: {}, onlySuperEffective: true },
};

/** The defensive matchup effect of an ability, or null if it changes no type
 *  matchup (so the UI can skip offering a toggle for it). */
export function abilityMatchup(ability: string): AbilityMatchup | null {
  const explicit = ABILITY_MATCHUPS[ability];
  if (explicit) return explicit;
  const immuneType = IMMUNITY[ability];
  if (immuneType) return { factors: { [immuneType]: 0 } };
  return null;
}

/** True when the ability changes at least one defensive type matchup. */
export function hasMatchupEffect(ability: string): boolean {
  return abilityMatchup(ability) !== null;
}

/** The defensive chart for a typing with an ability's effect folded in. */
export function defensiveChartWithAbility(
  types: readonly PokemonType[],
  ability: string | null,
): Record<PokemonType, number> {
  const base = defensiveChart(types);
  const am = ability ? abilityMatchup(ability) : null;
  if (!am) return base;

  const out = { ...base };
  for (const t of Object.keys(out) as PokemonType[]) {
    let m = out[t];
    if (am.onlySuperEffective && m <= 1) m = 0;
    if (am.superEffective !== undefined && m > 1) m *= am.superEffective;
    const factor = am.factors[t];
    if (factor !== undefined) m = factor === 0 ? 0 : m * factor;
    out[t] = m;
  }
  return out;
}
