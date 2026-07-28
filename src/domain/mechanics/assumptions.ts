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
      "Move power/accuracy/priority come from fixtures, not a confirmed provider feed.",
    source: "fixture",
    verified: false,
  },
} as const satisfies Record<string, Assumption>;

export type AssumptionId = keyof typeof ASSUMPTIONS;

export function assumptionsFor(ids: readonly AssumptionId[]): Assumption[] {
  return ids.map((id) => ASSUMPTIONS[id]);
}
