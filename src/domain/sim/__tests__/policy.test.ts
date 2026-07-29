import { describe, expect, it } from "vitest";
import { battleState, combatant, move, stats } from "../../__tests__/helpers";
import { greedyPolicy, practicePolicy, randomPolicy } from "../policy";
import { makeRng } from "../transition";

function state() {
  const a = combatant({
    name: "A",
    types: ["ice"],
    base: stats({ atk: 180 }),
    moves: [move({ name: "Icicle", type: "ice", power: 100 }), move({ name: "Weak", power: 20 })],
  });
  const b = combatant({ name: "B", types: ["normal"], base: stats(), moves: [move({ name: "Tackle" })] });
  const f1 = combatant({ name: "F1", types: ["dragon"], base: stats(), moves: [move({ name: "Bite" })] });
  const f2 = combatant({ name: "F2", types: ["grass"], base: stats(), moves: [move({ name: "Vine" })] });
  return battleState([a, b], [f1, f2]);
}

describe("policies return legal move combinations", () => {
  const s = state();
  const rng = makeRng(3);

  it("greedy picks one action per active slot, all moves", () => {
    const combo = greedyPolicy("aggressive")(s, "user", rng);
    expect(combo.length).toBe(2);
    expect(combo.every((a) => a.kind === "move")).toBe(true);
  });

  it("random is legal", () => {
    const combo = randomPolicy(s, "opponent", rng);
    expect(combo.length).toBe(2);
    expect(combo.every((a) => a.kind === "move")).toBe(true);
  });

  it("every difficulty returns a legal combination", () => {
    for (const diff of ["basic", "standard", "competitive", "highVariance"] as const) {
      const combo = practicePolicy(diff)(s, "opponent", makeRng(diff.length));
      expect(combo.length).toBe(2);
      expect(combo.every((a) => a.kind === "move")).toBe(true);
    }
  });
});
