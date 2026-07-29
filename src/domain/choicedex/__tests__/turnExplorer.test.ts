import { describe, expect, it } from "vitest";
import { battleState, combatant, move, stats } from "../../__tests__/helpers";
import { exploreTurns } from "../turnExplorer";

function makeState() {
  const a = combatant({
    name: "Atk",
    types: ["ice"],
    base: stats({ atk: 160, spe: 150 }),
    moves: [move({ name: "Icicle", type: "ice", power: 90 }), move({ name: "Jab", power: 40 })],
  });
  const p = combatant({ name: "Ptr", types: ["water"], base: stats({ spe: 120 }), moves: [move({ name: "Surf", type: "water", power: 90 })] });
  const f1 = combatant({ name: "Foe1", types: ["dragon"], base: stats({ spe: 100 }), moves: [move({ name: "Bite", power: 60 })] });
  const f2 = combatant({ name: "Foe2", types: ["grass"], base: stats({ spe: 80 }), moves: [move({ name: "Vine", power: 60 })] });
  return battleState([a, p], [f1, f2]);
}

describe("turn explorer", () => {
  it("builds a bounded tree that respects the node budget", () => {
    const res = exploreTurns(makeState(), "balanced", {
      maxDepth: 3,
      beamWidth: 2,
      probabilityThreshold: 0.01,
      maxNodes: 30,
    });
    expect(res.roots.length).toBeGreaterThan(0);
    expect(res.nodesExpanded).toBeLessThanOrEqual(30);
    // Root nodes have depth 0 and low/high roll children.
    expect(res.roots.every((n) => n.depth === 0)).toBe(true);
    expect(res.roots.some((n) => n.rollLabel === "low")).toBe(true);
    expect(res.roots.some((n) => n.rollLabel === "high")).toBe(true);
  });

  it("does not mutate the input state", () => {
    const state = makeState();
    const hp = state.opponent.active[0]!.currentHp;
    exploreTurns(state, "aggressive", { maxDepth: 2, beamWidth: 1, maxNodes: 20 });
    expect(state.opponent.active[0]!.currentHp).toBe(hp);
  });

  it("halves probability at each roll branch and prunes below threshold", () => {
    const res = exploreTurns(makeState(), "balanced", {
      maxDepth: 4,
      beamWidth: 1,
      probabilityThreshold: 0.2,
      maxNodes: 100,
    });
    // Root roll children are 0.5; with a 0.2 threshold the next ply (0.25) is
    // allowed but the one after (0.125) is pruned.
    for (const root of res.roots) {
      expect(root.probability).toBeCloseTo(0.5, 5);
      for (const child of root.children) {
        expect(child.probability).toBeCloseTo(0.25, 5);
        expect(child.children).toHaveLength(0);
      }
    }
  });
});
