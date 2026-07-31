import { describe, expect, it } from "vitest";
import { DEFAULT_FIELD } from "../../types/battle";
import type { Combatant } from "../../types/battle";
import { combatant, move, stats } from "../../__tests__/helpers";
import { calculateDamage } from "../damage";

const field = DEFAULT_FIELD;
const withAbility = (c: Combatant, ability: string): Combatant => ({ ...c, ability });
const withItem = (c: Combatant, item: string): Combatant => ({ ...c, item });

const atk = combatant({ name: "A", types: ["fire"], base: stats({ atk: 150, spa: 150 }) });
const foe = combatant({ name: "D", types: ["normal"], base: stats() });
const fire = move({ name: "Ember", type: "fire", power: 100 });
const normal = move({ name: "Tackle", type: "normal", power: 100 });

// [provisional] — ability/item effects use documented mainline behaviour.
describe("[provisional] ability effects", () => {
  it("Adaptability boosts STAB moves", () => {
    const base = calculateDamage(atk, foe, fire, field);
    const adapt = calculateDamage(withAbility(atk, "Adaptability"), foe, fire, field);
    expect(adapt.expectedDamage).toBeGreaterThan(base.expectedDamage);
  });

  it("Guts raises a statused attacker's physical damage and ignores burn", () => {
    const burned = { ...atk, status: "burn" as const };
    const noGuts = calculateDamage(burned, foe, normal, field);
    const guts = calculateDamage(withAbility(burned, "Guts"), foe, normal, field);
    expect(guts.expectedDamage).toBeGreaterThan(noGuts.expectedDamage * 2); // ×1.5 boost + un-halved
  });

  it("Levitate grants Ground immunity", () => {
    const ground = combatant({ name: "G", types: ["ground"], base: stats({ atk: 180 }) });
    const flyer = withAbility(combatant({ name: "F", types: ["normal"], base: stats() }), "Levitate");
    const r = calculateDamage(ground, flyer, move({ type: "ground", power: 100 }), field);
    expect(r.maxDamage).toBe(0);
  });

  it("Thick Fat halves Fire/Ice damage", () => {
    const base = calculateDamage(atk, foe, fire, field);
    const tf = calculateDamage(atk, withAbility(foe, "Thick Fat"), fire, field);
    expect(tf.expectedDamage).toBeLessThan(base.expectedDamage);
  });

  it("Multiscale halves damage at full HP only", () => {
    const full = withAbility(foe, "Multiscale");
    const hurt = { ...withAbility(foe, "Multiscale"), currentHp: Math.round(foe.stats.hp * 0.5) };
    const atFull = calculateDamage(atk, full, normal, field);
    const atHalf = calculateDamage(atk, hurt, normal, field);
    expect(atFull.expectedDamage).toBeLessThan(atHalf.expectedDamage);
  });
});

describe("[provisional] item effects", () => {
  it("Choice Band boosts physical damage ×1.5", () => {
    const base = calculateDamage(atk, foe, normal, field);
    const cb = calculateDamage(withItem(atk, "Choice Band"), foe, normal, field);
    expect(cb.expectedDamage).toBeGreaterThan(base.expectedDamage * 1.4);
  });

  it("Life Orb boosts damage ×1.3", () => {
    const base = calculateDamage(atk, foe, normal, field);
    const lo = calculateDamage(withItem(atk, "Life Orb"), foe, normal, field);
    expect(lo.expectedDamage).toBeGreaterThan(base.expectedDamage);
    expect(lo.modifiers.some((m) => m.name.includes("Life Orb"))).toBe(true);
  });

  it("Assault Vest reduces special damage taken", () => {
    const special = move({ name: "Flamethrower", type: "fire", category: "special", power: 100 });
    const base = calculateDamage(atk, foe, special, field);
    const av = calculateDamage(atk, withItem(foe, "Assault Vest"), special, field);
    expect(av.expectedDamage).toBeLessThan(base.expectedDamage);
  });
});
