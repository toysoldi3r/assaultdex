import { describe, expect, it } from "vitest";
import { battleState, combatant, move, stats } from "../../__tests__/helpers";
import type { MoveAction } from "../../mechanics/legalActions";
import type { Replay } from "../../replay/types";
import { analyzeReplay } from "../postBattle";

function userMove(slot: 0 | 1, name: string, targetSlot: 0 | 1): MoveAction {
  return {
    kind: "move",
    side: "user",
    slot,
    moveName: name,
    targetSide: "opponent",
    targetSlot,
    spread: false,
  };
}
function oppMove(slot: 0 | 1, name: string, targetSlot: 0 | 1): MoveAction {
  return {
    kind: "move",
    side: "opponent",
    slot,
    moveName: name,
    targetSide: "user",
    targetSlot,
    spread: false,
  };
}

function makeReplay(): Replay {
  const chien = combatant({
    name: "Chien",
    types: ["ice"],
    base: stats({ atk: 200, spe: 200 }),
    moves: [move({ name: "Icicle", type: "ice", power: 120 }), move({ name: "Weak", power: 15 })],
  });
  const ptr = combatant({ name: "Ptr", types: ["normal"], base: stats(), moves: [move({ name: "Tackle" })] });
  const foe1 = combatant({ name: "Foe1", types: ["dragon"], base: stats({ hp: 50 }), hpFraction: 0.3, moves: [move({ name: "Bite" })] });
  const foe2 = combatant({ name: "Foe2", types: ["grass"], base: stats(), moves: [move({ name: "Vine" })] });

  const state1 = battleState([chien, ptr], [foe1, foe2]);
  // Turn 2: Foe1 fainted (so turn-1 shows an observed KO).
  const state2 = battleState(
    [chien, ptr],
    [{ ...foe1, currentHp: 0, fainted: true }, foe2],
  );
  state2.turn = 2;

  return {
    format: "assaultdex-provisional-v1",
    players: ["You", "Opp"],
    userTeam: ["chien", "ptr"],
    opponentTeam: ["foe1", "foe2"],
    turns: [
      {
        state: state1,
        // Deliberately weak: play "Weak" instead of the KO move "Icicle".
        userAction: [userMove(0, "Weak", 0), userMove(1, "Tackle", 0)],
        opponentAction: [oppMove(0, "Bite", 0), oppMove(1, "Vine", 0)],
      },
      {
        state: state2,
        userAction: [userMove(0, "Icicle", 1), userMove(1, "Tackle", 1)],
        opponentAction: [oppMove(1, "Vine", 0)],
      },
    ],
  };
}

describe("analyzeReplay", () => {
  it("flags a suboptimal turn with a positive decision-value loss", () => {
    const a = analyzeReplay(makeReplay(), "aggressive");
    expect(a.turns).toHaveLength(2);
    expect(a.turns[0]!.decisionValueLoss).toBeGreaterThan(0);
    expect(a.turns[0]!.recommendedScore).toBeGreaterThanOrEqual(
      a.turns[0]!.actualScore,
    );
    expect(a.decisionQuality).toBeLessThanOrEqual(1);
  });

  it("records an observed KO on turn 1 for calibration", () => {
    const a = analyzeReplay(makeReplay(), "balanced");
    expect(a.turns[0]!.observedKo).toBe(true);
    expect(a.koCalibration).toHaveLength(2);
    expect(a.koCalibration[0]!.outcome).toBe(1);
  });

  it("derives a battle result from the final state", () => {
    const a = analyzeReplay(makeReplay(), "balanced");
    expect(["win", "loss", "draw", "timeout", "unknown"]).toContain(a.result);
  });
});
