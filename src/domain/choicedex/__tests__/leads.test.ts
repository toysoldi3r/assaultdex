import { describe, expect, it } from "vitest";
import { DEFAULT_FIELD } from "../../types/battle";
import { combatant, move, stats } from "../../__tests__/helpers";
import { analyzeLeads } from "../leads";

function makeCandidates() {
  const strongFast = combatant({
    name: "Chien",
    types: ["ice"],
    base: stats({ atk: 200, spe: 200 }),
    moves: [move({ name: "Icicle", type: "ice", power: 120 })],
  });
  const bulky = combatant({
    name: "Wall",
    types: ["steel"],
    base: stats({ hp: 200, def: 200 }),
    moves: [move({ name: "Tackle", power: 40 })],
  });
  const frail = combatant({
    name: "Frail",
    types: ["normal"],
    base: stats({ hp: 40, spe: 30 }),
    moves: [move({ name: "Weak", power: 20 })],
  });
  const foeA = combatant({
    name: "FoeA",
    types: ["dragon"],
    base: stats({ hp: 60 }),
    moves: [move({ name: "Bite", power: 60 })],
  });
  const foeB = combatant({
    name: "FoeB",
    types: ["grass"],
    base: stats(),
    moves: [move({ name: "Slam", power: 60 })],
  });
  const foeC = combatant({
    name: "FoeC",
    types: ["water"],
    base: stats(),
    moves: [move({ name: "Splash", power: 60 })],
  });
  return {
    user: [strongFast, bulky, frail],
    opp: [foeA, foeB, foeC],
  };
}

describe("analyzeLeads", () => {
  it("ranks lead pairs with a 0..1 score and full factor breakdown", () => {
    const { user, opp } = makeCandidates();
    const ranked = analyzeLeads({
      userCandidates: user,
      opponentCandidates: opp,
      field: DEFAULT_FIELD,
      profile: "balanced",
    });
    expect(ranked.length).toBe(3); // C(3,2)
    for (const r of ranked) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
      expect(r.factors).toHaveLength(4);
      expect(r.bestAgainst).not.toBe("");
    }
    // Sorted descending.
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.score).toBeGreaterThanOrEqual(ranked[i]!.score);
    }
  });

  it("prefers the fast, hard-hitting lead pair over the frail slow one", () => {
    const { user, opp } = makeCandidates();
    const ranked = analyzeLeads({
      userCandidates: user,
      opponentCandidates: opp,
      field: DEFAULT_FIELD,
      profile: "aggressive",
    });
    const top = ranked[0]!;
    expect(top.lead).toContain("Chien");
  });

  it("returns nothing when a side has fewer than two candidates", () => {
    const { user, opp } = makeCandidates();
    expect(
      analyzeLeads({
        userCandidates: [user[0]!],
        opponentCandidates: opp,
        field: DEFAULT_FIELD,
      }),
    ).toEqual([]);
  });
});
