import { describe, expect, it } from "vitest";
import { combatant, stats } from "../../__tests__/helpers";
import { DEFAULT_FIELD, NO_SIDE_CONDITIONS } from "../../types/battle";
import type { Combatant, SideConditions } from "../../types/battle";
import { hazardEntry } from "../hazards";

const withItem = (c: Combatant, item: string): Combatant => ({ ...c, item });
const withAbility = (c: Combatant, ability: string): Combatant => ({ ...c, ability });
const side = (p: Partial<SideConditions>): SideConditions => ({ ...NO_SIDE_CONDITIONS, ...p });

describe("hazardEntry", () => {
  it("Stealth Rock scales with Rock effectiveness", () => {
    const grass = combatant({ name: "G", types: ["grass"], base: stats() }); // Rock neutral → 12.5%
    const fire = combatant({ name: "F", types: ["fire"], base: stats() }); // Rock 2× → 25%
    const sr = side({ stealthRock: true });
    expect(hazardEntry(grass, sr, DEFAULT_FIELD).hpFraction).toBeCloseTo(0.125, 5);
    expect(hazardEntry(fire, sr, DEFAULT_FIELD).hpFraction).toBeCloseTo(0.25, 5);
  });

  it("Spikes only hurt grounded Pokémon", () => {
    const ground = combatant({ name: "G", types: ["normal"], base: stats() });
    const flyer = combatant({ name: "F", types: ["flying"], base: stats() });
    const sp = side({ spikes: 3 });
    expect(hazardEntry(ground, sp, DEFAULT_FIELD).hpFraction).toBeCloseTo(0.25, 5);
    expect(hazardEntry(flyer, sp, DEFAULT_FIELD).hpFraction).toBe(0);
  });

  it("Gravity grounds a Flyer for Spikes", () => {
    const flyer = combatant({ name: "F", types: ["flying"], base: stats() });
    const sp = side({ spikes: 1 });
    expect(hazardEntry(flyer, sp, { ...DEFAULT_FIELD, gravity: true }).hpFraction).toBeCloseTo(1 / 8, 5);
  });

  it("Toxic Spikes poison/badly-poison, but Poison types absorb and Steel is immune", () => {
    const normal = combatant({ name: "N", types: ["normal"], base: stats() });
    const poison = combatant({ name: "P", types: ["poison"], base: stats() });
    const steel = combatant({ name: "S", types: ["steel"], base: stats() });
    expect(hazardEntry(normal, side({ toxicSpikes: 1 }), DEFAULT_FIELD).status).toBe("poison");
    expect(hazardEntry(normal, side({ toxicSpikes: 2 }), DEFAULT_FIELD).status).toBe("toxic");
    expect(hazardEntry(poison, side({ toxicSpikes: 2 }), DEFAULT_FIELD).status).toBe("none");
    expect(hazardEntry(steel, side({ toxicSpikes: 2 }), DEFAULT_FIELD).status).toBe("none");
  });

  it("Sticky Web drops Speed by one stage for grounded", () => {
    const ground = combatant({ name: "G", types: ["normal"], base: stats() });
    expect(hazardEntry(ground, side({ stickyWeb: true }), DEFAULT_FIELD).speedDrop).toBe(1);
  });

  it("Heavy-Duty Boots grant full immunity; Magic Guard ignores chip", () => {
    const boots = withItem(combatant({ name: "B", types: ["fire"], base: stats() }), "Heavy-Duty Boots");
    const all = side({ stealthRock: true, spikes: 3, toxicSpikes: 2, stickyWeb: true });
    const be = hazardEntry(boots, all, DEFAULT_FIELD);
    expect(be.hpFraction).toBe(0);
    expect(be.status).toBe("none");
    expect(be.speedDrop).toBe(0);

    const mg = withAbility(combatant({ name: "M", types: ["fire"], base: stats() }), "Magic Guard");
    // Magic Guard ignores damage but not the Speed drop.
    const me = hazardEntry(mg, side({ stealthRock: true, stickyWeb: true }), DEFAULT_FIELD);
    expect(me.hpFraction).toBe(0);
    expect(me.speedDrop).toBe(1);
  });
});
