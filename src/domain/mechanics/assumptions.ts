// Central registry of PROVISIONAL mechanics assumptions.
//
// Pokémon Champions mechanics are not publicly documented. Per AGENTS.md we may
// not invent or assume mechanics. Everything in the mechanics engine is
// therefore derived from documented mainline formulas as a *provisional*
// placeholder and flagged here as unverified. Every engine result carries the
// ids it relied on so the UI can surface assumptions and never present output
// as verified.

export const MECHANICS_STATUS = "provisional" as const;

export type AssumptionSource = "mainline-derived" | "fixture";

export interface Assumption {
  id: string;
  description: string;
  source: AssumptionSource;
  verified: false;
}

export const ASSUMPTIONS = {
  typeChart: {
    id: "typeChart",
    description:
      "18-type effectiveness multipliers (0/¼/½/1/2/4) use the mainline chart. Unverified for Champions.",
    source: "mainline-derived",
    verified: false,
  },
  statFormula: {
    id: "statFormula",
    description:
      "Stats computed with the mainline formula (base, IV, EV, level, nature ±10%). Unverified for Champions.",
    source: "mainline-derived",
    verified: false,
  },
  speedOrder: {
    id: "speedOrder",
    description:
      "Move order = priority bracket, then effective Speed; ties are 50/50. Trick Room reverses Speed. Unverified for Champions.",
    source: "mainline-derived",
    verified: false,
  },
  damageFormula: {
    id: "damageFormula",
    description:
      "Damage uses the mainline formula with the 85–100% roll spread and a spread-move 0.75 modifier in doubles. Unverified for Champions.",
    source: "mainline-derived",
    verified: false,
  },
  moveData: {
    id: "moveData",
    description:
      "Move power/accuracy/priority/target come from fixtures, not a confirmed provider feed.",
    source: "fixture",
    verified: false,
  },
  weather: {
    id: "weather",
    description:
      "Sun boosts Fire ×1.5 and weakens Water ×0.5; Rain the reverse. Mainline-derived, unverified for Champions.",
    source: "mainline-derived",
    verified: false,
  },
  terrain: {
    id: "terrain",
    description:
      "Electric/Grassy/Psychic Terrain boost their type ×1.3 for grounded users; Misty halves Dragon vs grounded targets. Unverified for Champions.",
    source: "mainline-derived",
    verified: false,
  },
  screens: {
    id: "screens",
    description:
      "Reflect/Light Screen/Aurora Veil reduce damage of the matching category by 1/3 in doubles. Unverified for Champions.",
    source: "mainline-derived",
    verified: false,
  },
  grounding: {
    id: "grounding",
    description:
      "A Pokémon is treated as grounded unless it is Flying-type. Item/ability grounding effects are not modeled. Unverified for Champions.",
    source: "mainline-derived",
    verified: false,
  },
  tailwind: {
    id: "tailwind",
    description: "Tailwind doubles a side's Speed. Unverified for Champions.",
    source: "mainline-derived",
    verified: false,
  },
  abilityEffects: {
    id: "abilityEffects",
    description:
      "Ability effects (offensive/defensive multipliers, type immunities, speed) use documented mainline behaviour. Unverified for Champions.",
    source: "mainline-derived",
    verified: false,
  },
  itemEffects: {
    id: "itemEffects",
    description:
      "Held-item effects (Choice items, Life Orb, Assault Vest, type boosters, …) use documented mainline behaviour. Unverified for Champions.",
    source: "mainline-derived",
    verified: false,
  },
  secondaryEffects: {
    id: "secondaryEffects",
    description:
      "Move secondary effects (status/flinch/stat changes) use documented chances from move data and are applied only in simulations. Unverified for Champions.",
    source: "mainline-derived",
    verified: false,
  },
  entryEffects: {
    id: "entryEffects",
    description:
      "On-entry abilities (Intimidate −1 Atk to foes; weather setters like Drought/Drizzle; terrain setters like Electric Surge) are auto-applied to the initial state. Unverified for Champions.",
    source: "mainline-derived",
    verified: false,
  },
  reactiveItems: {
    id: "reactiveItems",
    description:
      "Reactive held items (Sitrus Berry heal at ≤50% HP, Weakness Policy +2 Atk/SpA when hit super-effectively, Focus Sash surviving a KO from full HP) trigger during simulations. Unverified for Champions.",
    source: "mainline-derived",
    verified: false,
  },
  residualEffects: {
    id: "residualEffects",
    description:
      "End-of-turn residuals (sandstorm −1/16, burn −1/16, poison −1/8, badly-poisoned n/16 ramp, Leftovers +1/16, Perish Song) and weather/terrain/Trick Room/screen/Tailwind countdowns use documented mainline rules and durations. Applied only in simulations. Unverified for Champions.",
    source: "mainline-derived",
    verified: false,
  },
  hazards: {
    id: "hazards",
    description:
      "Entry hazards (Stealth Rock 1/8×type-effectiveness, Spikes 1/8·1/6·1/4, Toxic Spikes poison/toxic, Sticky Web −1 Spe) and Gravity use documented mainline rules; Heavy-Duty Boots grant immunity. Unverified for Champions.",
    source: "mainline-derived",
    verified: false,
  },
  statInference: {
    id: "statInference",
    description:
      "Opponent offensive/defensive spreads are inferred by keeping only EV/IV/nature grid points whose damage rolls are consistent with observed HP change. Uses the provisional damage formula and a uniform (non-usage) prior.",
    source: "mainline-derived",
    verified: false,
  },
  spreadGridPrior: {
    id: "spreadGridPrior",
    description:
      "Opponent spreads are enumerated on a uniform grid (EV steps of 4, nature ±/0, IV 0/31) with equal priors. This is NOT usage-based - competitive-usage priors are deferred until a verified data source exists.",
    source: "fixture",
    verified: false,
  },
} as const satisfies Record<string, Assumption>;

export type AssumptionId = keyof typeof ASSUMPTIONS;

export function assumptionsFor(ids: readonly AssumptionId[]): Assumption[] {
  return ids.map((id) => ASSUMPTIONS[id]);
}
