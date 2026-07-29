// Damage calculation. Provisional (ASSUMPTIONS.damageFormula): documented
// mainline formula with the 16-value 85–100% roll spread, the doubles
// spread-move 0.75 modifier, weather/terrain/screens, and optional critical
// hits. Used as a placeholder until Champions mechanics are confirmed.
//
// Never returns a single "guaranteed" number: always the full roll spread plus
// KO/survival probabilities (spec). Every applied modifier is returned for
// transparency.

import type { Combatant, FieldState, SideConditions } from "../types/battle";
import { isSpreadTarget, type MoveFixture } from "../types/pokemon";
import type { AssumptionId } from "./assumptions";
import { isGrounded, terrainMultiplier, weatherMultiplier } from "./field";
import { stageMultiplier } from "./speed";
import { typeEffectiveness, type EffectivenessResult } from "./typeEffectiveness";

export interface DamageOptions {
  /** Force the spread modifier. Defaults to whether the move is a spread move. */
  spread?: boolean;
  /** Defender's side conditions (for screens). */
  defenderConditions?: SideConditions;
  /** Treat this as a critical hit. */
  crit?: boolean;
  /**
   * Skip the O(rolls²) two-hit-KO computation when only the damage rolls are
   * needed (the simulation/transition hot path). twoHitKoProbability is 0 then.
   */
  fast?: boolean;
}

export interface DamageModifier {
  name: string;
  multiplier: number;
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
  ohkoProbability: number;
  twoHitKoProbability: number;
  survivalProbability: number;
  accuracyAdjustedOhko: number;
  effectiveness: EffectivenessResult;
  /** Every multiplicative modifier applied (for transparency). */
  modifiers: DamageModifier[];
  assumptions: AssumptionId[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function zeroResult(
  effectiveness: EffectivenessResult,
  modifiers: DamageModifier[],
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
    modifiers,
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
  const assumptions = new Set<AssumptionId>([
    "damageFormula",
    "statFormula",
    "moveData",
  ]);
  const effectiveness = typeEffectiveness(move.type, defender.types);
  const modifiers: DamageModifier[] = [
    { name: "type effectiveness", multiplier: effectiveness.multiplier },
  ];

  if (move.category === "status" || move.power === null) {
    return zeroResult(effectiveness, modifiers, [...assumptions]);
  }
  if (effectiveness.multiplier === 0) {
    return zeroResult(effectiveness, modifiers, [...assumptions]);
  }

  const crit = options.crit ?? false;
  const isPhysical = move.category === "physical";
  const attackStat = isPhysical ? attacker.stats.atk : attacker.stats.spa;
  const defenseStat = isPhysical ? defender.stats.def : defender.stats.spd;
  let attackStage = isPhysical ? attacker.stages.atk : attacker.stages.spa;
  let defenseStage = isPhysical ? defender.stages.def : defender.stages.spd;

  // Critical hits ignore the defender's positive and the attacker's negative
  // stat stages.
  if (crit) {
    attackStage = Math.max(0, attackStage);
    defenseStage = Math.min(0, defenseStage);
  }

  let attack = attackStat * stageMultiplier(attackStage);
  const defense = defenseStat * stageMultiplier(defenseStage);
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

  // ---- Multiplicative modifiers ------------------------------------------
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  if (stab !== 1) modifiers.push({ name: "STAB", multiplier: stab });

  const weather = weatherMultiplier(move.type, field.weather);
  if (weather !== 1) {
    modifiers.push({ name: `weather (${field.weather})`, multiplier: weather });
    assumptions.add("weather");
  }

  const attackerGrounded = isGrounded(attacker.types);
  const defenderGrounded = isGrounded(defender.types);
  const terrain = terrainMultiplier(
    move.type,
    field.terrain,
    attackerGrounded,
    defenderGrounded,
  );
  if (terrain !== 1) {
    modifiers.push({ name: `terrain (${field.terrain})`, multiplier: terrain });
    assumptions.add("terrain");
    assumptions.add("grounding");
  }

  const spread = options.spread ?? isSpreadTarget(move.target);
  const spreadMod = spread ? 0.75 : 1;
  if (spreadMod !== 1) modifiers.push({ name: "spread", multiplier: spreadMod });

  // Screens (ignored on a crit).
  let screen = 1;
  const cond = options.defenderConditions;
  if (!crit && cond) {
    const active =
      (isPhysical && cond.reflect) ||
      (!isPhysical && cond.lightScreen) ||
      cond.auroraVeil;
    if (active) {
      screen = 2 / 3; // doubles reduction
      modifiers.push({ name: "screen", multiplier: screen });
      assumptions.add("screens");
    }
  }

  const critMod = crit ? 1.5 : 1;
  if (critMod !== 1) modifiers.push({ name: "critical hit", multiplier: critMod });

  const modifier =
    stab * effectiveness.multiplier * weather * terrain * spreadMod * screen * critMod;

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

  let twoHitKoProbability = 0;
  if (!options.fast) {
    let twoHitKo = 0;
    for (const r1 of rolls) {
      for (const r2 of rolls) {
        if (r1 + r2 >= currentHp) twoHitKo++;
      }
    }
    twoHitKoProbability = twoHitKo / (rolls.length * rolls.length);
  }

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
    modifiers,
    assumptions: [...assumptions],
  };
}
