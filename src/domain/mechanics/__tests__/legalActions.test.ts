import { describe, expect, it } from "vitest";
import { battleState, combatant, move, stats } from "../../__tests__/helpers";
import {
  legalCombinations,
  slotActions,
  userLegalCombinations,
} from "../legalActions";

function makeState() {
  const u1 = combatant({
    name: "U1",
    types: ["fire"],
    base: stats(),
    moves: [move({ name: "Flare", type: "fire" }), move({ name: "Tackle" })],
  });
  const u2 = combatant({
    name: "U2",
    types: ["water"],
    base: stats(),
    moves: [move({ name: "Surf", type: "water" })],
  });
  const o1 = combatant({ name: "O1", types: ["grass"], base: stats(), moves: [move({ name: "Vine" })] });
  const o2 = combatant({ name: "O2", types: ["rock"], base: stats(), moves: [move({ name: "Rock" })] });
  return battleState([u1, u2], [o1, o2]);
}

describe("slotActions", () => {
  it("enumerates each move against each opposing target", () => {
    const state = makeState();
    const actions = slotActions(state, "user", 0);
    // U1 has 2 moves × 2 targets = 4 move actions, no bench => 4 total.
    expect(actions).toHaveLength(4);
    expect(actions.every((a) => a.kind === "move")).toBe(true);
  });
});

describe("legalCombinations", () => {
  it("takes the cartesian product across both active slots", () => {
    const state = makeState();
    const combos = userLegalCombinations(state);
    // U1: 4 actions, U2: 1 move × 2 targets = 2 actions => 4 × 2 = 8.
    expect(combos).toHaveLength(8);
    expect(combos.every((c) => c.length === 2)).toBe(true);
  });

  it("excludes fainted active Pokémon", () => {
    const state = makeState();
    state.opponent.active[1] = { ...state.opponent.active[1]!, fainted: true };
    const combos = legalCombinations(state, "user");
    // Only one legal target now: U1 2 moves × 1 = 2, U2 1 move × 1 = 1 => 2.
    expect(combos).toHaveLength(2);
  });
});
