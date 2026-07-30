import { describe, expect, it } from "vitest";
import { battleState, combatant, move, stats } from "../../__tests__/helpers";
import type { MoveAction } from "../../mechanics/legalActions";
import { applyTurn, makeRng } from "../transition";

function userMove(slot: 0 | 1, name: string): MoveAction {
  return { kind: "move", side: "user", slot, moveName: name, targetSide: "opponent", targetSlot: 0, spread: false };
}
function oppMove(slot: 0 | 1, name: string): MoveAction {
  return { kind: "move", side: "opponent", slot, moveName: name, targetSide: "user", targetSlot: 0, spread: false };
}

describe("simulation applies move secondary/self effects", () => {
  it("applies a guaranteed status secondary to the target", () => {
    const nuzzle = move({ name: "Nuzzle", type: "electric", power: 20, secondary: { chance: 100, status: "paralysis" } });
    const a = combatant({ name: "A", types: ["electric"], base: stats({ spe: 200 }), moves: [nuzzle] });
    const p = combatant({ name: "P", types: ["normal"], base: stats(), moves: [move({ name: "Wait" })] });
    const f1 = combatant({ name: "F1", types: ["normal"], base: stats({ spe: 50 }), moves: [move({ name: "Wait" })] });
    const f2 = combatant({ name: "F2", types: ["normal"], base: stats({ spe: 40 }), moves: [move({ name: "Wait" })] });
    const state = battleState([a, p], [f1, f2]);
    const { state: next } = applyTurn(state, [userMove(0, "Nuzzle"), userMove(1, "Wait")], [oppMove(0, "Wait"), oppMove(1, "Wait")], makeRng(1));
    expect(next.opponent.active[0]!.status).toBe("paralysis");
  });

  it("flinch makes a slower target lose its action", () => {
    const wait = move({ name: "Wait", category: "status", power: null, accuracy: null });
    const flincher = move({ name: "Fake Flinch", type: "normal", power: 40, secondary: { chance: 100, flinch: true } });
    const fast = combatant({ name: "Fast", types: ["normal"], base: stats({ atk: 130, spe: 250 }), moves: [flincher] });
    const partner = combatant({ name: "Ptr", types: ["normal"], base: stats(), moves: [wait] });
    const slowFoe = combatant({ name: "Slow", types: ["normal"], base: stats({ atk: 150, spe: 30 }), moves: [move({ name: "Bang", power: 100 })] });
    const foe2 = combatant({ name: "F2", types: ["normal"], base: stats({ spe: 20 }), moves: [wait] });
    const state = battleState([fast, partner], [slowFoe, foe2]);
    const userHpBefore = state.user.active[0]!.currentHp;
    // Fast flinches slowFoe (targets slot 0), so slowFoe's "Bang" on the user is skipped.
    const { state: next } = applyTurn(
      state,
      [userMove(0, "Fake Flinch"), userMove(1, "Wait")],
      [oppMove(0, "Bang"), oppMove(1, "Wait")],
      makeRng(2),
    );
    expect(next.user.active[0]!.currentHp).toBe(userHpBefore); // Bang never landed
  });

  it("applies self stat drops after a landing move", () => {
    const dracoLike = move({ name: "Overload", type: "dragon", category: "special", power: 130, selfBoosts: { spa: -2 } });
    const a = combatant({ name: "A", types: ["dragon"], base: stats({ spa: 150, spe: 200 }), moves: [dracoLike] });
    const p = combatant({ name: "P", types: ["normal"], base: stats(), moves: [move({ name: "Wait" })] });
    const f1 = combatant({ name: "F1", types: ["normal"], base: stats(), moves: [move({ name: "Wait" })] });
    const f2 = combatant({ name: "F2", types: ["normal"], base: stats(), moves: [move({ name: "Wait" })] });
    const state = battleState([a, p], [f1, f2]);
    const { state: next } = applyTurn(state, [userMove(0, "Overload"), userMove(1, "Wait")], [oppMove(0, "Wait"), oppMove(1, "Wait")], makeRng(3));
    expect(next.user.active[0]!.stages.spa).toBe(-2);
  });
});
