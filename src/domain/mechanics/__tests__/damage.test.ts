import { describe, expect, it } from "vitest";
import { DEFAULT_FIELD } from "../../types/battle";
import { combatant, move, stats } from "../../__tests__/helpers";
import { calculateDamage } from "../damage";

const field = DEFAULT_FIELD;

// [provisional] - damage formula is unverified for Champions.
describe("[provisional] calculateDamage", () => {
  it("produces 16 ascending rolls with min ≤ expected ≤ max", () => {
    const attacker = combatant({ name: "A", types: ["fire"], base: stats({ atk: 150 }) });
    const defender = combatant({ name: "D", types: ["grass"], base: stats() });
    const r = calculateDamage(attacker, defender, move({ type: "fire", power: 100 }), field);
    expect(r.rolls).toHaveLength(16);
    expect(r.minDamage).toBeLessThanOrEqual(r.expectedDamage);
    expect(r.expectedDamage).toBeLessThanOrEqual(r.maxDamage);
    for (let i = 1; i < r.rolls.length; i++) {
      expect(r.rolls[i]!).toBeGreaterThanOrEqual(r.rolls[i - 1]!);
    }
  });

  it("applies STAB and super-effective multipliers", () => {
    const attacker = combatant({ name: "A", types: ["fire"], base: stats({ atk: 150 }) });
    const defender = combatant({ name: "D", types: ["grass"], base: stats() });
    const stabSuper = calculateDamage(attacker, defender, move({ type: "fire", power: 100 }), field);
    const neutralNoStab = calculateDamage(attacker, defender, move({ type: "normal", power: 100 }), field);
    // fire is STAB (1.5) and super effective vs grass (2) => far more damage.
    expect(stabSuper.expectedDamage).toBeGreaterThan(neutralNoStab.expectedDamage);
    expect(stabSuper.effectiveness.multiplier).toBe(2);
  });

  it("returns zero for an immune matchup", () => {
    const attacker = combatant({ name: "A", types: ["ground"], base: stats({ atk: 200 }) });
    const defender = combatant({ name: "D", types: ["flying"], base: stats() });
    const r = calculateDamage(attacker, defender, move({ type: "ground", power: 100 }), field);
    expect(r.maxDamage).toBe(0);
    expect(r.survivalProbability).toBe(1);
    expect(r.ohkoProbability).toBe(0);
  });

  it("guarantees survival probability = 1 − OHKO probability", () => {
    const attacker = combatant({ name: "A", types: ["normal"], base: stats({ atk: 120 }) });
    const defender = combatant({ name: "D", types: ["normal"], base: stats(), hpFraction: 0.3 });
    const r = calculateDamage(attacker, defender, move({ power: 80 }), field);
    expect(r.survivalProbability).toBeCloseTo(1 - r.ohkoProbability, 5);
  });

  it("adjusts OHKO probability by accuracy", () => {
    const attacker = combatant({ name: "A", types: ["ice"], base: stats({ atk: 200 }) });
    const defender = combatant({ name: "D", types: ["dragon"], base: stats(), hpFraction: 0.2 });
    const r = calculateDamage(attacker, defender, move({ type: "ice", power: 120, accuracy: 90 }), field);
    if (r.ohkoProbability > 0) {
      expect(r.accuracyAdjustedOhko).toBeLessThan(r.ohkoProbability + 1e-9);
      expect(r.accuracyAdjustedOhko).toBeCloseTo(r.ohkoProbability * 0.9, 5);
    }
  });
  it("returns null 2HKO odds in fast mode instead of a false zero", () => {
    const attacker = combatant({ name: "A", types: ["normal"], base: stats({ atk: 120 }) });
    const defender = combatant({ name: "D", types: ["normal"], base: stats() });
    const r = calculateDamage(attacker, defender, move({ power: 80 }), field, { fast: true });
    expect(r.twoHitKoProbability).toBeNull();
  });

  it("models fixed multi-hit rolls as independent hit distributions", () => {
    const attacker = combatant({ name: "A", types: ["normal"], base: stats({ atk: 120 }) });
    const defender = combatant({ name: "D", types: ["normal"], base: stats() });
    const single = calculateDamage(attacker, defender, move({ power: 25 }), field);
    const double = calculateDamage(attacker, defender, move({ power: 25, hits: 2 }), field);
    expect(double.minDamage).toBe(single.minDamage * 2);
    expect(double.maxDamage).toBe(single.maxDamage * 2);
    expect(double.rolls.length).toBe(16);
  });

  // Exact integer damage, cross-checked against the mainline @smogon/calc
  // pipeline (modifiers applied in order with per-stage poke-rounding). These
  // lock in the KO-threshold accuracy: collapsing modifiers into one multiply
  // used to drift 1-2 HP here (292-346 instead of 290-344).
  it("matches mainline integer damage for a STAB super-effective hit in sun", () => {
    // atk base 152 -> stat 172; def base 100 -> def 120; fire vs grass = 2x.
    const attacker = combatant({ name: "A", types: ["fire"], base: stats({ atk: 152 }) });
    const defender = combatant({ name: "D", types: ["grass"], base: stats() });
    const sun = { ...DEFAULT_FIELD, weather: "sun" as const };
    const r = calculateDamage(attacker, defender, move({ type: "fire", power: 120 }), sun);
    expect(r.minDamage).toBe(290);
    expect(r.maxDamage).toBe(344);
  });

  it("applies burn as a final damage step (mainline order)", () => {
    // Burned physical STAB, power 120, neutral: 48-57 with end-step burn.
    const attacker = {
      ...combatant({ name: "A", types: ["normal"], base: stats({ atk: 152 }) }),
      status: "burn" as const,
    };
    const defender = combatant({ name: "D", types: ["normal"], base: stats() });
    const r = calculateDamage(attacker, defender, move({ type: "normal", power: 120 }), field);
    expect(r.minDamage).toBe(48);
    expect(r.maxDamage).toBe(57);
  });

  it("guarantees at least 1 damage on a connecting, non-immune hit", () => {
    // A doubly-resisted chip (0.25x) that a single-floor multiply rounds to 0.
    const attacker = combatant({ name: "A", types: ["normal"], base: stats({ atk: 5 }) });
    const defender = combatant({ name: "D", types: ["fire", "dragon"], base: stats({ def: 250, hp: 255 }) });
    const r = calculateDamage(attacker, defender, move({ type: "grass", power: 10 }), field);
    expect(r.effectiveness.multiplier).toBe(0.25);
    expect(r.minDamage).toBeGreaterThanOrEqual(1);
  });

  it("handles large fixed hit counts without exploding the convolution", () => {
    // Population Bomb = 10 hits. Exact convolution would be 16^10 buckets, so it
    // must fall back to the scaled approximation and return finite values fast.
    const attacker = combatant({ name: "A", types: ["normal"], base: stats({ atk: 120 }) });
    const defender = combatant({ name: "D", types: ["normal"], base: stats() });
    const t = Date.now();
    const r = calculateDamage(attacker, defender, move({ power: 20, hits: 10 }), field);
    expect(Date.now() - t).toBeLessThan(1000);
    expect(r.rolls.length).toBe(16);
    expect(Number.isFinite(r.maxDamage)).toBe(true);
    expect(r.minDamage).toBeGreaterThan(0);
    expect(r.maxDamage).toBeGreaterThanOrEqual(r.minDamage);
  });

});
