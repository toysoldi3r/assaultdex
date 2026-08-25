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
import {
  abilityDefense,
  abilityImmune,
  abilityOffense,
  abilityUngrounds,
  type AbilityContext,
} from "./abilities";
import { isGrounded, terrainMultiplier, weatherMultiplier } from "./field";
import { itemDefense, itemOffense } from "./items";
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
   * needed (the simulation/transition hot path). twoHitKoProbability is null then.
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
  twoHitKoProbability: number | null;
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

// Round half down, matching the mainline damage engine's "poke-round" (a value
// ending in exactly .5 rounds down). Applied at each modifier stage so
// compounded rolls land on the same integers the game would produce.
function pokeRound(n: number): number {
  return n - Math.floor(n) > 0.5 ? Math.ceil(n) : Math.floor(n);
}

// Variable multi-hit moves (2–5 hits). Expected hits ≈ 3.2 normally, 5 with
// Skill Link - so the readout doesn't assume the maximum every time.
const VARIABLE_MULTIHIT = new Set([
  "Bullet Seed", "Rock Blast", "Pin Missile", "Icicle Spear", "Bone Rush",
  "Tail Slap", "Water Shuriken", "Scale Shot", "Fury Attack", "Comet Punch",
  "Double Slap", "Spike Cannon", "Barrage", "Fury Swipes", "Arm Thrust",
]);

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
    twoHitKoProbability: null,
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

  // Ability/item context (provisional Champions behaviour).
  const abilityCtx: AbilityContext = {
    attacker,
    defender,
    move,
    moveType: move.type,
    field,
    effectiveness: effectiveness.multiplier,
    isPhysical,
    attackerHpFraction: attacker.currentHp / Math.max(1, attacker.stats.hp),
    defenderAtFullHp: defender.currentHp >= defender.stats.hp,
  };

  // Ability-based immunity (Levitate vs Ground, Flash Fire vs Fire, …).
  if (abilityImmune(abilityCtx)) {
    modifiers.push({ name: `immune (${defender.ability})`, multiplier: 0 });
    assumptions.add("abilityEffects");
    return zeroResult(effectiveness, modifiers, [...assumptions]);
  }

  // Stat selection with move overrides:
  // - overrideOffensiveStat: Body Press uses Defense as the attacking stat.
  // - useTargetOffense: Foul Play uses the target's (defender's) attacking stat.
  // - overrideDefensiveStat: Psyshock/Secret Sword hit physical Defense.
  const offKey = move.overrideOffensiveStat ?? (isPhysical ? "atk" : "spa");
  const defKey = move.overrideDefensiveStat ?? (isPhysical ? "def" : "spd");
  const offSource = move.useTargetOffense ? defender : attacker;

  let attackStage = offSource.stages[offKey];
  let defenseStage = defender.stages[defKey];

  // Critical hits ignore the defender's positive and the attacker's negative
  // stat stages.
  if (crit) {
    attackStage = Math.max(0, attackStage);
    defenseStage = Math.min(0, defenseStage);
  }

  // Boosted stats are floored after the stage multiplier, as the game does
  // (a +1 odd stat truncates rather than carrying a half-point into the formula).
  const attack = Math.floor(offSource.stats[offKey] * stageMultiplier(attackStage));
  const defense = Math.floor(defender.stats[defKey] * stageMultiplier(defenseStage));
  // Burn is applied as a final x0.5 damage step in the pipeline below (mainline
  // order), not to the Attack stat - unless Guts ignores it.
  const burnApplies =
    isPhysical && attacker.status === "burn" && attacker.ability !== "Guts";

  const level = attacker.level;
  // Acrobatics doubles its power when the user holds no item (or it was consumed).
  const basePower =
    move.name === "Acrobatics" && !attacker.item ? move.power * 2 : move.power;
  const base =
    Math.floor(
      Math.floor(
        (Math.floor((2 * level) / 5 + 2) * basePower * attack) / defense,
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

  // Gravity grounds every Pokémon (Flying / Levitate included).
  const attackerGrounded =
    field.gravity || (isGrounded(attacker.types) && !abilityUngrounds(attacker.ability));
  const defenderGrounded =
    field.gravity || (isGrounded(defender.types) && !abilityUngrounds(defender.ability));
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

  // Ability and item multipliers (offense from attacker, defense from defender).
  const itemCtx = {
    attacker,
    defender,
    move,
    moveType: move.type,
    isPhysical,
    effectiveness: effectiveness.multiplier,
  };
  const abOff = abilityOffense(abilityCtx);
  const abDef = abilityDefense(abilityCtx);
  const itOff = itemOffense(itemCtx);
  const itDef = itemDefense(itemCtx);
  if (abOff !== 1) {
    modifiers.push({ name: `${attacker.ability} (atk)`, multiplier: abOff });
    assumptions.add("abilityEffects");
  }
  if (abDef !== 1) {
    modifiers.push({ name: `${defender.ability} (def)`, multiplier: abDef });
    assumptions.add("abilityEffects");
  }
  if (itOff !== 1) {
    modifiers.push({ name: `${attacker.item} (atk)`, multiplier: itOff });
    assumptions.add("itemEffects");
  }
  if (itDef !== 1) {
    modifiers.push({ name: `${defender.item} (def)`, multiplier: itDef });
    assumptions.add("itemEffects");
  }

  // Multi-hit moves. Fixed-count moves (Dragon Darts ×2) always hit that many;
  // variable 2–5 hit moves use the expected count (~3.2, or 5 with Skill Link)
  // instead of assuming the maximum every time.
  const variable = VARIABLE_MULTIHIT.has(move.name);
  const hits = variable
    ? attacker.ability === "Skill Link"
      ? 5
      : 3.2
    : move.hits && move.hits > 1
      ? move.hits
      : 1;
  if (hits > 1) {
    modifiers.push({ name: variable ? `~${hits} hits (avg)` : `${hits} hits`, multiplier: hits });
  }

  if (burnApplies) modifiers.push({ name: "burn", multiplier: 0.5 });

  // Apply the modifiers in mainline order with per-stage rounding (poke-round;
  // ties round down) rather than collapsing them into one multiply and flooring
  // once. This reproduces the engine's exact integer damage - and therefore its
  // KO thresholds - instead of drifting a point or two on compounded rolls.
  //
  // Slots that mirror the game exactly: spread -> weather -> crit, then per roll
  // random -> STAB -> type -> burn. Terrain, screens, abilities and items are
  // grouped into the post-type "other" chain (as the game does for its final
  // damage modifiers); the few that are really base-power effects are close
  // enough there to stay within a point.
  const otherMod = terrain * screen * abOff * abDef * itOff * itDef;
  let pre = base;
  if (spread) pre = pokeRound(pre * spreadMod); // targets (0.75)
  if (weather !== 1) pre = pokeRound(pre * weather); // weather (1.5 / 0.5)
  if (crit) pre = Math.floor(pre * critMod); // critical hit (1.5)

  const perHitRolls: number[] = [];
  for (let roll = 85; roll <= 100; roll++) {
    let d = Math.floor((pre * roll) / 100); // damage roll (85-100%)
    d = Math.floor(pokeRound(d * stab) * effectiveness.multiplier); // STAB, then type
    if (burnApplies) d = Math.floor(d * 0.5); // burn
    d = pokeRound(Math.max(1, d * otherMod)); // screens/items/abilities/terrain; min 1
    perHitRolls.push(d);
  }

  let buckets: [number, number][];
  // Exact per-hit convolution is 16^hits buckets, so only run it for small
  // fixed hit counts (2–3). Large fixed-count moves (Population Bomb = 10) would
  // explode to trillions of buckets, so fall back to the scaled single-roll
  // approximation below alongside the variable-hit moves.
  if (Number.isInteger(hits) && hits <= 3) {
    let distribution = new Map<number, number>([[0, 1]]);
    for (let hit = 0; hit < hits; hit++) {
      const next = new Map<number, number>();
      for (const [sum, count] of distribution) {
        for (const roll of perHitRolls) {
          next.set(sum + roll, (next.get(sum + roll) ?? 0) + count);
        }
      }
      distribution = next;
    }
    buckets = [...distribution.entries()].sort((a, b) => a[0] - b[0]);
  } else {
    // Average-hit approximations are explicitly labelled above; keep the usual
    // 16 roll buckets rather than pretending to know Champions hit-count odds.
    buckets = perHitRolls.map((roll) => [Math.round(roll * hits), 1]);
  }

  const totalOutcomes = buckets.reduce((sum, [, count]) => sum + count, 0);
  const valueAt = (position: number): number => {
    let seen = 0;
    for (const [damage, count] of buckets) {
      seen += count;
      if (seen > position) return damage;
    }
    return buckets[buckets.length - 1]?.[0] ?? 0;
  };
  const rolls = Array.from({ length: 16 }, (_, idx) => {
    const pos = Math.round((idx / 15) * (totalOutcomes - 1));
    return valueAt(pos);
  });

  const minDamage = rolls[0] ?? 0;
  const maxDamage = rolls[rolls.length - 1] ?? 0;
  const expectedDamage = buckets.reduce((sum, [damage, count]) => sum + damage * count, 0) / totalOutcomes;

  const maxHp = defender.stats.hp;
  const currentHp = defender.currentHp;

  const ohkoOutcomes = buckets.reduce((sum, [damage, count]) => sum + (damage >= currentHp ? count : 0), 0);
  const ohkoProbability = ohkoOutcomes / totalOutcomes;

  let twoHitKoProbability: number | null = null;
  if (!options.fast) {
    let twoHitKo = 0;
    for (const [r1, c1] of buckets) {
      for (const [r2, c2] of buckets) {
        if (r1 + r2 >= currentHp) twoHitKo += c1 * c2;
      }
    }
    twoHitKoProbability = twoHitKo / (totalOutcomes * totalOutcomes);
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
    twoHitKoProbability: twoHitKoProbability === null ? null : round2(twoHitKoProbability),
    survivalProbability: round2(1 - ohkoProbability),
    accuracyAdjustedOhko: round2(ohkoProbability * accFrac),
    effectiveness,
    modifiers,
    assumptions: [...assumptions],
  };
}
