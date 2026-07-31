import { describe, expect, it } from "vitest";
import { combatant, move, stats } from "../../__tests__/helpers";
import { calculateDamage } from "../../mechanics/damage";
import { computeStat } from "../../mechanics/stats";
import { DEFAULT_FIELD, NEUTRAL_STAGES } from "../../types/battle";
import type { Combatant } from "../../types/battle";
import type { Nature } from "../../types/pokemon";
import { inferDefense, inferOffense } from "../spreadInference";

const field = DEFAULT_FIELD;

// A synthetic attacker with a chosen physical Attack stat (mirrors the module).
function attackerWithAtk(atk: number): Combatant {
  return {
    species: "x", name: "Opp", types: ["normal"], level: 50,
    stats: { hp: 100, atk, def: 100, spa: 100, spd: 100, spe: 100 },
    currentHp: 100, status: "none", stages: { ...NEUTRAL_STAGES },
    ability: null, item: null, moves: [], fainted: false, tier: "inferred",
  };
}

describe("inferOffense", () => {
  it("keeps the true spread and rules out weaker ones", () => {
    const defender = combatant({ name: "Me", types: ["normal"], base: stats({ hp: 180, def: 120 }) });
    const m = move({ name: "Return", type: "normal", category: "physical", power: 100 });
    const baseAtk = 120;
    // Truth: 252 EV, 31 IV, +nature.
    const adamant: Nature = { name: "atk+", boosted: "atk", lowered: "spa" };
    const trueAtk = computeStat(baseAtk, 31, 252, 50, "atk", adamant);
    const trueDmg = calculateDamage(attackerWithAtk(trueAtk), defender, m, field, { fast: true });
    const observed = trueDmg.maxDamage; // a high roll only strong spreads reach

    const inf = inferOffense({
      baseStat: baseAtk, which: "atk", attackerTypes: ["normal"], level: 50,
      move: m, defender, field, observedDamage: observed,
    });

    expect(inf.contradiction).toBe(false);
    expect(inf.remaining).toBeGreaterThan(0);
    expect(inf.eliminated).toBeGreaterThan(0); // 0-EV spreads can't reach it
    expect(inf.maxInvestmentPossible).toBe(true);
    expect(inf.minStat!).toBeLessThanOrEqual(trueAtk);
    expect(inf.maxStat!).toBeGreaterThanOrEqual(trueAtk);
  });

  it("flags a contradiction when no spread fits", () => {
    const defender = combatant({ name: "Me", types: ["normal"], base: stats({ hp: 180, def: 120 }) });
    const m = move({ name: "Return", type: "normal", category: "physical", power: 100 });
    const inf = inferOffense({
      baseStat: 120, which: "atk", attackerTypes: ["normal"], level: 50,
      move: m, defender, field, observedDamage: 99999,
    });
    expect(inf.contradiction).toBe(true);
    expect(inf.remaining).toBe(0);
  });
});

describe("inferDefense", () => {
  it("finds bulk consistent with an observed damage fraction", () => {
    const attacker = combatant({ name: "Me", types: ["normal"], base: stats({ atk: 150 }) });
    const m = move({ name: "Return", type: "normal", category: "physical", power: 100 });
    // Build a real target to produce a plausible observed fraction.
    const target = combatant({ name: "Them", types: ["normal"], base: stats({ hp: 160, def: 140 }) });
    const dmg = calculateDamage(attacker, target, m, field, { fast: true });
    const observedFraction = dmg.expectedDamage / target.stats.hp;

    const inf = inferDefense({
      baseHp: 160, baseDef: 140, which: "def", defenderTypes: ["normal"], level: 50,
      move: m, attacker, field, observedFraction,
    });
    expect(inf.contradiction).toBe(false);
    expect(inf.remaining).toBeGreaterThan(0);
    expect(inf.bulkMin!).toBeLessThanOrEqual(inf.bulkMax!);
  });
});
