import { describe, expect, it } from "vitest";
import { battleState, combatant, move, stats } from "../../__tests__/helpers";
import { greedyPolicy, practicePolicy, randomPolicy } from "../policy";
import { runSimulations, simulateBattle } from "../simulate";
import { makeRng } from "../transition";

// A lopsided matchup: strong fast user team vs frail slow foes.
function lopsided() {
  const a = combatant({
    name: "Atk",
    types: ["ice"],
    base: stats({ atk: 200, spe: 200 }),
    moves: [move({ name: "Icicle", type: "ice", power: 110 })],
  });
  const b = combatant({
    name: "Atk2",
    types: ["fire"],
    base: stats({ atk: 200, spe: 190 }),
    moves: [move({ name: "Flare", type: "fire", power: 110 })],
  });
  const f1 = combatant({ name: "Foe1", types: ["grass"], base: stats({ hp: 60, spe: 40 }), moves: [move({ name: "Vine", power: 40 })] });
  const f2 = combatant({ name: "Foe2", types: ["dragon"], base: stats({ hp: 60, spe: 30 }), moves: [move({ name: "Bite", power: 40 })] });
  return battleState([a, b], [f1, f2]);
}

describe("simulateBattle", () => {
  it("produces a terminal outcome and a KO count", () => {
    const sim = simulateBattle(
      lopsided(),
      greedyPolicy("aggressive"),
      greedyPolicy("balanced"),
      makeRng(1),
      20,
    );
    expect(["user", "opponent", "draw", "timeout"]).toContain(sim.outcome);
    expect(sim.userKOs).toBeGreaterThanOrEqual(0);
    expect(sim.turns).toBeGreaterThan(0);
  });

  it("does not mutate the input state", () => {
    const state = lopsided();
    const hp = state.opponent.active[0]!.currentHp;
    simulateBattle(state, greedyPolicy(), randomPolicy, makeRng(2), 10);
    expect(state.opponent.active[0]!.currentHp).toBe(hp);
  });
});

describe("runSimulations", () => {
  it("aggregates a win probability in [0,1] with a CI and is reproducible", () => {
    const cfg = {
      state: lopsided(),
      userPolicy: greedyPolicy("aggressive"),
      opponentPolicy: practicePolicy("standard"),
      runs: 200,
      seed: 42,
    };
    const r1 = runSimulations(cfg);
    const r2 = runSimulations(cfg);
    expect(r1.completed).toBe(200);
    expect(r1.winProbability).toBeGreaterThanOrEqual(0);
    expect(r1.winProbability).toBeLessThanOrEqual(1);
    // Wald CI half-width is 0 only at p=0 or p=1; otherwise positive.
    expect(r1.winCiHalfWidth).toBeGreaterThanOrEqual(0);
    // Reproducible for the same seed.
    expect(r2.winProbability).toBe(r1.winProbability);
    // The lopsided-favoured user should usually win.
    expect(r1.winProbability).toBeGreaterThan(0.5);
  });

  it("stops early when cancelled and returns the partial result", () => {
    let calls = 0;
    const r = runSimulations({
      state: lopsided(),
      userPolicy: greedyPolicy(),
      opponentPolicy: greedyPolicy(),
      runs: 1000,
      seed: 7,
      shouldCancel: () => ++calls > 10, // cancel after ~10 checks
    });
    expect(r.cancelled).toBe(true);
    expect(r.completed).toBeLessThan(1000);
  });
});
