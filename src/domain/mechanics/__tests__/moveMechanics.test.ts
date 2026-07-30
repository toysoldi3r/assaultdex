import { describe, expect, it } from "vitest";
import { DEFAULT_FIELD } from "../../types/battle";
import { combatant, move, stats } from "../../__tests__/helpers";
import { calculateDamage } from "../damage";

const field = DEFAULT_FIELD;

// [provisional] — special move mechanics use documented (Showdown) rules over the
// provisional Champions damage formula.
describe("[provisional] special move mechanics", () => {
  it("Body Press scales with the user's Defense, not Attack", () => {
    // Wall: huge Def, tiny Atk. Body Press should out-damage a same-power
    // Attack-based move.
    const wall = combatant({ name: "Wall", types: ["fighting"], base: stats({ atk: 40, def: 200 }) });
    const foe = combatant({ name: "Foe", types: ["normal"], base: stats() });
    const bodyPress = move({ name: "Body Press", type: "fighting", power: 80, overrideOffensiveStat: "def" });
    const normalHit = move({ name: "Karate Chop", type: "fighting", power: 80 });
    const bp = calculateDamage(wall, foe, bodyPress, field);
    const nh = calculateDamage(wall, foe, normalHit, field);
    expect(bp.expectedDamage).toBeGreaterThan(nh.expectedDamage);
  });

  it("Foul Play scales with the TARGET's Attack", () => {
    // Weak user vs a heavy physical attacker: Foul Play uses the target's Atk.
    const user = combatant({ name: "User", types: ["dark"], base: stats({ atk: 50 }) });
    const bruiser = combatant({ name: "Bruiser", types: ["normal"], base: stats({ atk: 220 }) });
    const foulPlay = move({ name: "Foul Play", type: "dark", power: 95, useTargetOffense: true });
    const normalDark = move({ name: "Bite", type: "dark", power: 95 });
    const fp = calculateDamage(user, bruiser, foulPlay, field);
    const nd = calculateDamage(user, bruiser, normalDark, field);
    // Foul Play (target atk 220) hits far harder than the user's own weak atk.
    expect(fp.expectedDamage).toBeGreaterThan(nd.expectedDamage);
  });

  it("Psyshock (special) hits physical Defense", () => {
    // Target with high SpD but low Def: a Def-targeting special move hits harder.
    const attacker = combatant({ name: "Atk", types: ["psychic"], base: stats({ spa: 150 }) });
    const specialWall = combatant({ name: "SpWall", types: ["normal"], base: stats({ def: 50, spd: 200 }) });
    const psyshock = move({ name: "Psyshock", type: "psychic", category: "special", power: 80, overrideDefensiveStat: "def" });
    const normalSpecial = move({ name: "Psychic", type: "psychic", category: "special", power: 80 });
    const ps = calculateDamage(attacker, specialWall, psyshock, field);
    const nsp = calculateDamage(attacker, specialWall, normalSpecial, field);
    expect(ps.expectedDamage).toBeGreaterThan(nsp.expectedDamage);
  });

  it("multi-hit moves multiply total damage", () => {
    const attacker = combatant({ name: "Atk", types: ["dragon"], base: stats({ atk: 120 }) });
    const foe = combatant({ name: "Foe", types: ["normal"], base: stats() });
    const single = move({ name: "Single", type: "dragon", power: 50 });
    const twice = move({ name: "Dragon Darts", type: "dragon", power: 50, hits: 2 });
    const s = calculateDamage(attacker, foe, single, field);
    const t = calculateDamage(attacker, foe, twice, field);
    expect(t.expectedDamage).toBeCloseTo(s.expectedDamage * 2, 0);
    expect(t.modifiers.some((m) => m.name === "2 hits")).toBe(true);
  });
});
