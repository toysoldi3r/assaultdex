import { describe, expect, it } from "vitest";
import { move } from "../../__tests__/helpers";
import { describeMoveEffects } from "../moveEffects";

describe("describeMoveEffects", () => {
  it("returns no chips for a plain move", () => {
    expect(describeMoveEffects(move())).toEqual([]);
  });

  it("describes a status secondary with its chance", () => {
    const m = move({ name: "Scald", secondary: { chance: 30, status: "burn" } });
    expect(describeMoveEffects(m)).toContain("30% burn");
  });

  it("describes flinch and target stat drops", () => {
    const m = move({ secondary: { chance: 10, flinch: true, boosts: { spd: -1 } } });
    expect(describeMoveEffects(m)).toContain("10% flinch + −1 SpD");
  });

  it("describes self stat drops", () => {
    const m = move({ name: "Draco Meteor", category: "special", selfBoosts: { spa: -2 } });
    expect(describeMoveEffects(m)).toContain("−2 SpA (self)");
  });

  it("describes stat overrides and multi-hit", () => {
    expect(describeMoveEffects(move({ overrideOffensiveStat: "def" }))).toContain(
      "Uses Def to attack",
    );
    expect(describeMoveEffects(move({ useTargetOffense: true }))).toContain(
      "Uses target's Attack",
    );
    expect(describeMoveEffects(move({ overrideDefensiveStat: "def" }))).toContain(
      "Hits Def",
    );
    expect(describeMoveEffects(move({ hits: 2 }))).toContain("Hits 2×");
  });
});
