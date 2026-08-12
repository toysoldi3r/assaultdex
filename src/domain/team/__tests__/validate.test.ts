import { describe, expect, it } from "vitest";
import type { PokemonSet } from "../../types/pokemon";
import { validateTeam, type ValidatableMember } from "../validate";

function set(overrides: Partial<PokemonSet> = {}): PokemonSet {
  return {
    species: "incineroar",
    level: 50,
    ability: "Intimidate",
    item: "Assault Vest",
    nature: "Adamant",
    moves: ["Fake Out", "Flare Blitz", "Knock Off", "Parting Shot"],
    spread: {
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
    },
    ...overrides,
  };
}

function member(overrides: Partial<PokemonSet> = {}): ValidatableMember {
  return {
    set: set(overrides),
    legalMoves: ["Fake Out", "Flare Blitz", "Knock Off", "Parting Shot", "U-turn"],
    legalNatures: ["Adamant", "Serious", "Jolly"],
    legalAbilities: ["Blaze", "Intimidate"],
  };
}

describe("validateTeam", () => {
  it("accepts a legal team", () => {
    const r = validateTeam([member()]);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("rejects EV totals over the cap", () => {
    const r = validateTeam([
      member({
        spread: {
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          evs: { hp: 252, atk: 252, def: 252, spa: 0, spd: 0, spe: 0 },
        },
      }),
    ]);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field === "evs")).toBe(true);
  });

  it("flags illegal and duplicate moves", () => {
    const illegal = validateTeam([member({ moves: ["Fake Out", "Hyper Beam"] })]);
    expect(illegal.errors.some((e) => e.message.includes("Hyper Beam"))).toBe(true);

    const dup = validateTeam([member({ moves: ["Fake Out", "Fake Out"] })]);
    expect(dup.errors.some((e) => e.message.includes("Duplicate moves"))).toBe(true);
  });

  it("flags an ability not legal for the species", () => {
    const r = validateTeam([member({ ability: "Levitate" })]);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field === "ability")).toBe(true);
  });

  it("enforces the species clause", () => {
    const r = validateTeam([member(), member()]);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field === "species")).toBe(true);
  });

  it("enforces the item clause (no duplicate items)", () => {
    const r = validateTeam([
      member(),
      member({ species: "landorustherian", item: "Assault Vest" }),
    ]);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field === "item" && e.message.includes("Duplicate item"))).toBe(true);
  });

  it("allows distinct items and empty items", () => {
    const r = validateTeam([
      member(),
      member({ species: "landorustherian", item: "Life Orb" }),
      member({ species: "amoonguss", item: null }),
    ]);
    expect(r.errors.some((e) => e.field === "item")).toBe(false);
  });

  it("warns on non-multiple-of-4 EVs without failing", () => {
    const r = validateTeam([
      member({
        spread: {
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          evs: { hp: 250, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        },
      }),
    ]);
    expect(r.warnings.some((w) => w.field === "evs")).toBe(true);
    expect(r.valid).toBe(true);
  });
});
