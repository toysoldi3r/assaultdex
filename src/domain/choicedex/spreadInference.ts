// Opponent offensive/defensive spread inference from an observed HP change.
// Enumerate the EV/IV/nature grid for the relevant stat, keep only the grid
// points whose damage rolls are consistent with what actually happened, and
// summarize the surviving range. Pure and mechanics-driven - uses the
// provisional damage formula and a uniform (non-usage) prior
// (ASSUMPTIONS.statInference).

import { calculateDamage } from "../mechanics/damage";
import { computeStat } from "../mechanics/stats";
import type {
  Combatant,
  FieldState,
  SideConditions,
} from "../types/battle";
import { NEUTRAL_STAGES } from "../types/battle";
import type { MoveFixture, Nature, PokemonType } from "../types/pokemon";
import type { NatureSign } from "./speedInference";

const EV_STEP = 4;

/** Nature objects that raise/neutral/lower a given attacking stat. */
function offenseNature(sign: NatureSign, stat: "atk" | "spa"): Nature {
  const other = stat === "atk" ? "spa" : "atk";
  if (sign === "+") return { name: `${stat}+`, boosted: stat, lowered: other };
  if (sign === "-") return { name: `${stat}-`, boosted: other, lowered: stat };
  return { name: "neutral", boosted: stat, lowered: stat };
}

/** Nature objects that raise/neutral/lower a given defensive stat. */
function defenseNature(sign: NatureSign, stat: "def" | "spd"): Nature {
  const other = stat === "def" ? "spd" : "def";
  if (sign === "+") return { name: `${stat}+`, boosted: stat, lowered: other };
  if (sign === "-") return { name: `${stat}-`, boosted: other, lowered: stat };
  return { name: "neutral", boosted: stat, lowered: stat };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function shares(signs: NatureSign[]): Record<NatureSign, number> {
  const counts: Record<NatureSign, number> = { "+": 0, "0": 0, "-": 0 };
  for (const s of signs) counts[s]++;
  const d = signs.length || 1;
  return { "+": round(counts["+"] / d), "0": round(counts["0"] / d), "-": round(counts["-"] / d) };
}

// ---------------------------------------------------------------------------
// Offense: infer the opponent's Atk/SpA from damage it dealt to your Pokémon.
// ---------------------------------------------------------------------------

export interface OffenseInferenceInput {
  /** Opponent base Atk or SpA. */
  baseStat: number;
  which: "atk" | "spa";
  attackerTypes: [PokemonType] | [PokemonType, PokemonType];
  level: number;
  attackerAbility?: string | null;
  attackerItem?: string | null;
  /** The move the opponent used. */
  move: MoveFixture;
  /** Your Pokémon that took the hit (fully known). */
  defender: Combatant;
  field: FieldState;
  /** Your side's conditions (screens reduce the damage). */
  defenderConditions?: SideConditions;
  /** HP points removed from your Pokémon by the hit. */
  observedDamage: number;
  /** Was the hit a spread move (0.75 modifier)? */
  spread?: boolean;
}

export interface SpreadInference {
  total: number;
  remaining: number;
  eliminated: number;
  minStat: number | null;
  maxStat: number | null;
  evMin: number | null;
  evMax: number | null;
  natureShare: Record<NatureSign, number>;
  maxInvestmentPossible: boolean;
  confidence: number;
  /** Human note when nothing is consistent (bad input or wrong assumption). */
  contradiction: boolean;
  assumptions: ("statInference" | "damageFormula" | "statFormula")[];
}

function syntheticAttacker(
  types: [PokemonType] | [PokemonType, PokemonType],
  level: number,
  which: "atk" | "spa",
  statValue: number,
  ability: string | null,
  item: string | null,
): Combatant {
  const stats = { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };
  stats[which] = statValue;
  return {
    species: "unknown",
    name: "Opponent",
    types,
    level,
    stats,
    currentHp: 100,
    status: "none",
    stages: { ...NEUTRAL_STAGES },
    ability: ability ?? null,
    item: item ?? null,
    moves: [],
    fainted: false,
    tier: "inferred",
  };
}

export function inferOffense(input: OffenseInferenceInput): SpreadInference {
  const signs: NatureSign[] = ["+", "0", "-"];
  const stat = input.which;
  const surviving: { ev: number; sign: NatureSign; value: number }[] = [];
  let total = 0;

  for (const sign of signs) {
    for (const iv of [0, 31]) {
      for (let ev = 0; ev <= 252; ev += EV_STEP) {
        total++;
        const value = computeStat(
          input.baseStat,
          iv,
          ev,
          input.level,
          stat,
          offenseNature(sign, stat),
        );
        const attacker = syntheticAttacker(
          input.attackerTypes,
          input.level,
          stat,
          value,
          input.attackerAbility ?? null,
          input.attackerItem ?? null,
        );
        const dmg = calculateDamage(attacker, input.defender, input.move, input.field, {
          spread: input.spread,
          defenderConditions: input.defenderConditions,
          fast: true,
        });
        if (input.observedDamage >= dmg.minDamage && input.observedDamage <= dmg.maxDamage) {
          surviving.push({ ev, sign, value });
        }
      }
    }
  }

  return summarize(surviving, total);
}

// ---------------------------------------------------------------------------
// Defense: infer the opponent's bulk from damage YOUR move dealt to it.
// Two coupled unknowns (HP and the defending stat), so ranges are wider.
// ---------------------------------------------------------------------------

export interface DefenseInferenceInput {
  baseHp: number;
  baseDef: number;
  which: "def" | "spd";
  defenderTypes: [PokemonType] | [PokemonType, PokemonType];
  level: number;
  defenderAbility?: string | null;
  defenderItem?: string | null;
  /** Your move + attacker (fully known). */
  move: MoveFixture;
  attacker: Combatant;
  field: FieldState;
  defenderConditions?: SideConditions;
  /** Fraction of the opponent's max HP removed (0..1). */
  observedFraction: number;
  /** ± tolerance on the observed fraction (rounding slack). Default 0.02. */
  tolerance?: number;
  spread?: boolean;
}

export interface DefenseInference {
  total: number;
  remaining: number;
  hpMin: number | null;
  hpMax: number | null;
  defMin: number | null;
  defMax: number | null;
  /** Effective-HP (hp × defStat) range - the true "bulk" measure. */
  bulkMin: number | null;
  bulkMax: number | null;
  confidence: number;
  contradiction: boolean;
  assumptions: ("statInference" | "damageFormula" | "statFormula")[];
}

function syntheticDefender(
  types: [PokemonType] | [PokemonType, PokemonType],
  level: number,
  which: "def" | "spd",
  hp: number,
  defValue: number,
  ability: string | null,
  item: string | null,
): Combatant {
  const stats = { hp, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };
  stats[which] = defValue;
  return {
    species: "unknown",
    name: "Opponent",
    types,
    level,
    stats,
    currentHp: hp,
    status: "none",
    stages: { ...NEUTRAL_STAGES },
    ability: ability ?? null,
    item: item ?? null,
    moves: [],
    fainted: false,
    tier: "inferred",
  };
}

export function inferDefense(input: DefenseInferenceInput): DefenseInference {
  const tol = input.tolerance ?? 0.02;
  const signs: NatureSign[] = ["+", "0", "-"];
  const step = 8; // coarser grid to keep the coupled search snappy
  const hps: number[] = [];
  const defs: { value: number }[] = [];

  for (const iv of [0, 31]) {
    for (let ev = 0; ev <= 252; ev += step) {
      hps.push(computeStat(input.baseHp, iv, ev, input.level, "hp", defenseNature("0", input.which)));
    }
  }
  for (const sign of signs) {
    for (const iv of [0, 31]) {
      for (let ev = 0; ev <= 252; ev += step) {
        defs.push({
          value: computeStat(input.baseDef, iv, ev, input.level, input.which, defenseNature(sign, input.which)),
        });
      }
    }
  }

  const keptHp: number[] = [];
  const keptDef: number[] = [];
  const keptBulk: number[] = [];
  let total = 0;

  for (const hp of hps) {
    for (const d of defs) {
      total++;
      const defender = syntheticDefender(
        input.defenderTypes,
        input.level,
        input.which,
        hp,
        d.value,
        input.defenderAbility ?? null,
        input.defenderItem ?? null,
      );
      const dmg = calculateDamage(input.attacker, defender, input.move, input.field, {
        spread: input.spread,
        defenderConditions: input.defenderConditions,
        fast: true,
      });
      const minFrac = dmg.minDamage / hp;
      const maxFrac = dmg.maxDamage / hp;
      if (input.observedFraction >= minFrac - tol && input.observedFraction <= maxFrac + tol) {
        keptHp.push(hp);
        keptDef.push(d.value);
        keptBulk.push(hp * d.value);
      }
    }
  }

  const remaining = keptHp.length;
  const eliminatedFrac = total > 0 ? (total - remaining) / total : 0;
  return {
    total,
    remaining,
    hpMin: remaining ? Math.min(...keptHp) : null,
    hpMax: remaining ? Math.max(...keptHp) : null,
    defMin: remaining ? Math.min(...keptDef) : null,
    defMax: remaining ? Math.max(...keptDef) : null,
    bulkMin: remaining ? Math.min(...keptBulk) : null,
    bulkMax: remaining ? Math.max(...keptBulk) : null,
    confidence: remaining === 0 ? 0 : round(Math.min(0.85, eliminatedFrac)),
    contradiction: remaining === 0,
    assumptions: ["statInference", "damageFormula", "statFormula"],
  };
}

function summarize(
  surviving: { ev: number; sign: NatureSign; value: number }[],
  total: number,
): SpreadInference {
  const remaining = surviving.length;
  const values = surviving.map((s) => s.value);
  const evs = surviving.map((s) => s.ev);
  const eliminated = total - remaining;
  return {
    total,
    remaining,
    eliminated,
    minStat: remaining ? Math.min(...values) : null,
    maxStat: remaining ? Math.max(...values) : null,
    evMin: remaining ? Math.min(...evs) : null,
    evMax: remaining ? Math.max(...evs) : null,
    natureShare: shares(surviving.map((s) => s.sign)),
    maxInvestmentPossible: surviving.some((s) => s.ev === 252 && s.sign === "+"),
    confidence:
      remaining === 0
        ? 0
        : remaining === 1
          ? 0.9
          : round(Math.min(0.85, eliminated / (total || 1))),
    contradiction: remaining === 0,
    assumptions: ["statInference", "damageFormula", "statFormula"],
  };
}
