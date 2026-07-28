// Damage calculation. Provisional (ASSUMPTIONS.damageFormula): documented
// mainline formula with the 16-value 85–100% roll spread and the doubles
// spread-move 0.75 modifier, used as a placeholder until Champions mechanics
// are confirmed.
//
// Never returns a single "guaranteed" number: always the full roll spread plus
// KO/survival probabilities (spec).

import type { Combatant, FieldState } from "../types/battle";
import type { MoveFixture } from "../types/pokemon";
import type { AssumptionId } from "./assumptions";
import { stageMultiplier } from "./speed";
import { typeEffectiveness, type EffectivenessResult } from "./typeEffectiveness";

export interface DamageOptions {
  /** True if the move hits both opposing Pokémon (doubles spread modifier). */
  spread?: boolean;
}

export interface DamageResult {
  /** 16 damage values (rolls 85..100%), ascending. */
  rolls: number[];
  minDamage: number;
  maxDamage: number;
  expectedDamage: number;
  minPercent: number;
  maxPercent: number;
  expectedPercent: number;
  /** Damage-only probability the defender is KO'd by one hit. */
  ohkoProbability: number;
  /** Damage-only probability two hits KO (assuming both connect). */
  twoHitKoProbability: number;
  /** Damage-only probability the defender survives one hit. */
  survivalProbability: number;
  /** OHKO probability adjusted for move accuracy. */
  accuracyAdjustedOhko: number;
  effectiveness: EffectivenessResult;
  assumptions: AssumptionId[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Zero-damage result (status moves / immunities), still fully shaped. */
function zeroResult(
  effectiveness: EffectivenessResult,
  assumptions: AssumptionId[],
): DamageResult {
  return {
    rolls: new Array(16).fill(0),
    minDamage: 0,
    maxDamage: 0,
    expectedDamage: 0,
    minPercent: 0,
    maxPercent: 0,
    expectedPercent: 0,
    ohkoProbability: 0,
    twoHitKoProbability: 0,
    survivalProbability: 1,
    accuracyAdjustedOhko: 0,
    effectiveness,
    assumptions,
  };
}

export function calculateDamage(
  attacker: Combatant,
  defender: Combatant,
  move: MoveFixture,
  field: FieldState,
  options: DamageOptions = {},
): DamageResult {
  const assumptions: AssumptionId[] = ["damageFormula", "statFormula", "moveData"];
  const effectiveness = typeEffectiveness(move.type, defender.types);

  if (move.category === "status" || move.power === null) {
    return zeroResult(effectiveness, assumptions);
  }
  if (effectiveness.multiplier === 0) {
    return zeroResult(effectiveness, assumptions);
  }

  const isPhysical = move.category === "physical";
  const attackStat = isPhysical ? attacker.stats.atk : attacker.stats.spa;
  const attackStage = isPhysical ? attacker.stages.atk : attacker.stages.spa;
  const defenseStat = isPhysical ? defender.stats.def : defender.stats.spd;
  const defenseStage = isPhysical ? defender.stages.def : defender.stages.spd;

  let attack = attackStat * stageMultiplier(attackStage);
  const defense = defenseStat * stageMultiplier(defenseStage);

  // Burn halves physical attack (provisional mainline behaviour).
  if (isPhysical && attacker.status === "burn") {
    attack *= 0.5;
  }

  const level = attacker.level;
  const base =
    Math.floor(
      Math.floor(
        (Math.floor((2 * level) / 5 + 2) * move.power * attack) / defense,
      ) / 50,
    ) + 2;

  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const spread = options.spread ? 0.75 : 1;
  const modifier = stab * effectiveness.multiplier * spread;

  const rolls: number[] = [];
  for (let roll = 85; roll <= 100; roll++) {
    const rolled = Math.floor((base * roll) / 100);
    rolls.push(Math.max(0, Math.floor(rolled * modifier)));
  }
  rolls.sort((a, b) => a - b);

  const minDamage = rolls[0] ?? 0;
  const maxDamage = rolls[rolls.length - 1] ?? 0;
  const expectedDamage = rolls.reduce((a, b) => a + b, 0) / rolls.length;

  const maxHp = defender.stats.hp;
  const currentHp = defender.currentHp;

  const ohkoRolls = rolls.filter((d) => d >= currentHp).length;
  const ohkoProbability = ohkoRolls / rolls.length;

  // Two independent rolls (assuming both hits connect).
  let twoHitKo = 0;
  for (const r1 of rolls) {
    for (const r2 of rolls) {
      if (r1 + r2 >= currentHp) twoHitKo++;
    }
  }
  const twoHitKoProbability = twoHitKo / (rolls.length * rolls.length);

  const accFrac = move.accuracy === null ? 1 : move.accuracy / 100;

  return {
    rolls,
    minDamage,
    maxDamage,
    expectedDamage: round2(expectedDamage),
    minPercent: round2((minDamage / maxHp) * 100),
    maxPercent: round2((maxDamage / maxHp) * 100),
    expectedPercent: round2((expectedDamage / maxHp) * 100),
    ohkoProbability: round2(ohkoProbability),
    twoHitKoProbability: round2(twoHitKoProbability),
    survivalProbability: round2(1 - ohkoProbability),
    accuracyAdjustedOhko: round2(ohkoProbability * accFrac),
    effectiveness,
    assumptions,
  };
}
