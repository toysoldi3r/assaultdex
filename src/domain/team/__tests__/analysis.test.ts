import { describe, expect, it } from "vitest";
import type { BaseStats, MoveFixture, Nature, PokemonType } from "../../types/pokemon";
import { analyzeTeam, type AnalysisMember } from "../analysis";

const NEUTRAL: Nature = { name: "Serious", boosted: "spe", lowered: "spe" };

function stats(spe: number): BaseStats {
  return { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe };
}

function move(name: string, type: PokemonType, priority = 0): MoveFixture {
  return { name, type, category: "physical", power: 80, accuracy: 100, priority, target: "normal" };
}

function member(
  name: string,
  types: [PokemonType] | [PokemonType, PokemonType],
  moves: MoveFixture[],
  spe = 100,
): AnalysisMember {
  return {
    species: name.toLowerCase(),
    name,
    types,
    baseStats: stats(spe),
    moves,
    level: 50,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    nature: NEUTRAL,
  };
}

describe("analyzeTeam", () => {
  it("detects a shared defensive weakness", () => {
    // Two Fire types share a Water/Ground/Rock weakness.
    const team = [
      member("A", ["fire"], [move("Ember", "fire")]),
      member("B", ["fire"], [move("Flame", "fire")]),
    ];
    const a = analyzeTeam(team);
    const water = a.weaknesses.find((w) => w.type === "water");
    expect(water?.members).toEqual(["A", "B"]);
    expect(water?.shared).toBe(true);
  });

  it("flags a 4× weakness as major and records per-member multipliers", () => {
    // Grass/Ground takes 4× from Ice (2× × 2×).
    const team = [member("A", ["grass", "ground"], [move("Vine", "grass")])];
    const a = analyzeTeam(team);
    const ice = a.weaknesses.find((w) => w.type === "ice");
    expect(ice?.major).toBe(true);
    expect(ice?.detail).toEqual([{ name: "A", mult: 4 }]);
  });

  it("lists immunities and resistances with their multipliers", () => {
    // Ground is immune to Electric; Grass/Ground resists nothing extra here.
    const team = [member("A", ["ground"], [move("Quake", "ground")])];
    const a = analyzeTeam(team);
    const electric = a.resistances.find((r) => r.type === "electric");
    expect(electric?.members).toEqual([{ name: "A", mult: 0 }]);
    // A resisted type (Rock resists Poison at 0.5×) shows the fractional mult.
    const poison = a.resistances.find((r) => r.type === "poison");
    expect(poison?.members).toEqual([{ name: "A", mult: 0.5 }]);
  });

  it("reports offensive coverage and gaps", () => {
    const team = [member("A", ["fire"], [move("Ember", "fire")])];
    const a = analyzeTeam(team);
    // Fire hits grass super-effectively → grass is covered, not a gap.
    expect(a.coverage.some((c) => c.type === "grass")).toBe(true);
    expect(a.offensiveGaps).not.toContain("grass");
    // Nothing hits fire super-effectively here → fire is a gap.
    expect(a.offensiveGaps).toContain("fire");
  });

  it("orders speed tiers descending", () => {
    const team = [
      member("Slow", ["normal"], [move("Tackle", "normal")], 40),
      member("Fast", ["normal"], [move("Tackle2", "normal")], 130),
    ];
    const a = analyzeTeam(team);
    expect(a.speedTiers[0]!.name).toBe("Fast");
    expect(a.speedTiers[0]!.speed).toBeGreaterThan(a.speedTiers[1]!.speed);
  });

  it("flags missing speed control and detects priority", () => {
    const noControl = analyzeTeam([member("A", ["normal"], [move("Tackle", "normal")])]);
    expect(noControl.speedControl.missing).toBe(true);

    const withPriority = analyzeTeam([
      member("A", ["water"], [move("Aqua Jet", "water", 1)]),
    ]);
    expect(withPriority.speedControl.hasPriority).toBe(true);
    expect(withPriority.speedControl.missing).toBe(false);
  });
});
