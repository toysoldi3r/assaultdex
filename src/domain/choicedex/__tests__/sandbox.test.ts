import { describe, expect, it } from "vitest";
import { battleState, combatant, move, stats } from "../../__tests__/helpers";
import { compareScenarios, withScenario } from "../sandbox";

function makeState() {
  const a = combatant({
    name: "Atk",
    types: ["ice"],
    base: stats({ atk: 180, spe: 150 }),
    moves: [move({ name: "Icicle", type: "ice", power: 100 })],
  });
  const p = combatant({ name: "Ptr", types: ["normal"], base: stats(), moves: [move({ name: "Tackle" })] });
  const f1 = combatant({ name: "Foe1", types: ["dragon"], base: stats(), moves: [move({ name: "Bite" })] });
  const f2 = combatant({ name: "Foe2", types: ["grass"], base: stats(), moves: [move({ name: "Vine" })] });
  return battleState([a, p], [f1, f2]);
}

describe("scenario sandbox", () => {
  it("does not mutate the original state", () => {
    const base = makeState();
    const beforeHp = base.opponent.active[0]!.currentHp;
    withScenario(base, (draft) => {
      draft.opponent.active[0]!.currentHp = 1;
    });
    expect(base.opponent.active[0]!.currentHp).toBe(beforeHp);
  });

  it("reflects a variable change in the comparison deltas", () => {
    const base = makeState();
    // Variant: opponent at 20% HP → higher KO probability / score.
    const variant = withScenario(base, (draft) => {
      const foe = draft.opponent.active[0]!;
      foe.currentHp = Math.round(foe.stats.hp * 0.2);
    });
    const cmp = compareScenarios(base, variant, "aggressive");
    expect(cmp.variant.koProbability).toBeGreaterThanOrEqual(
      cmp.baseline.koProbability,
    );
    expect(cmp.deltas.koProbability).toBeCloseTo(
      cmp.variant.koProbability - cmp.baseline.koProbability,
      5,
    );
  });
});
