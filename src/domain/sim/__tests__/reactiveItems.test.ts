import { describe, expect, it } from "vitest";
import { battleState, combatant, move, stats } from "../../__tests__/helpers";
import type { Combatant } from "../../types/battle";
import type { MoveAction } from "../../mechanics/legalActions";
import { applyTurn, makeRng } from "../transition";

const withItem = (c: Combatant, item: string): Combatant => ({ ...c, item });

function userMove(slot: 0 | 1, name: string): MoveAction {
  return { kind: "move", side: "user", slot, moveName: name, targetSide: "opponent", targetSlot: 0, spread: false };
}
function wait(slot: 0 | 1, side: "user" | "opponent"): MoveAction {
  return { kind: "move", side, slot, moveName: "Wait", targetSide: side === "user" ? "opponent" : "user", targetSlot: 0, spread: false };
}
const waitMove = move({ name: "Wait", category: "status", power: null, accuracy: null });

function foes(t0: Combatant, t1: Combatant): [Combatant, Combatant] {
  return [t0, t1];
}

describe("reactive held items in simulation", () => {
  it("Weakness Policy raises Atk/SpA when hit super-effectively", () => {
    const fire = move({ name: "Flamethrower", type: "fire", category: "special", power: 60 });
    const a = combatant({ name: "A", types: ["fire"], base: stats({ spa: 120, spe: 200 }), moves: [fire] });
    const p = combatant({ name: "P", types: ["normal"], base: stats(), moves: [waitMove] });
    // Grass target: Fire is super-effective. High HP so it survives.
    const wp = withItem(combatant({ name: "WP", types: ["grass"], base: stats({ hp: 255, def: 200, spd: 200 }), moves: [waitMove] }), "Weakness Policy");
    const f2 = combatant({ name: "F2", types: ["normal"], base: stats(), moves: [waitMove] });
    const state = battleState([a, p], foes(wp, f2));
    const { state: next } = applyTurn(state, [userMove(0, "Flamethrower"), wait(1, "user")], [wait(0, "opponent"), wait(1, "opponent")], makeRng(7));
    const t = next.opponent.active[0]!;
    expect(t.fainted).toBe(false);
    expect(t.stages.atk).toBe(2);
    expect(t.stages.spa).toBe(2);
    expect(t.item).toBeNull();
  });

  it("Sitrus Berry heals when HP drops to ≤50%", () => {
    const hit = move({ name: "Hit", type: "normal", power: 70 });
    const a = combatant({ name: "A", types: ["normal"], base: stats({ atk: 120, spe: 200 }), moves: [hit] });
    const p = combatant({ name: "P", types: ["normal"], base: stats(), moves: [waitMove] });
    const mkFoe = (item: string) =>
      foes(
        withItem(combatant({ name: "T", types: ["normal"], base: stats({ hp: 200 }), moves: [waitMove], hpFraction: 0.5 }), item),
        combatant({ name: "F2", types: ["normal"], base: stats(), moves: [waitMove] }),
      );
    const actions = () => applyTurn(
      battleState([a, p], mkFoe("Sitrus Berry")),
      [userMove(0, "Hit"), wait(1, "user")],
      [wait(0, "opponent"), wait(1, "opponent")],
      makeRng(3),
    );
    const noBerry = applyTurn(
      battleState([a, p], mkFoe("None")),
      [userMove(0, "Hit"), wait(1, "user")],
      [wait(0, "opponent"), wait(1, "opponent")],
      makeRng(3),
    );
    const withBerry = actions();
    const healed = withBerry.state.opponent.active[0]!;
    const plain = noBerry.state.opponent.active[0]!;
    expect(healed.currentHp).toBeGreaterThan(plain.currentHp);
    expect(healed.item).toBeNull();
  });

  it("Focus Sash survives a KO from full HP with 1 HP", () => {
    const nuke = move({ name: "Nuke", type: "fighting", category: "physical", power: 150 });
    const a = combatant({ name: "A", types: ["fighting"], base: stats({ atk: 255, spe: 200 }), moves: [nuke] });
    const p = combatant({ name: "P", types: ["normal"], base: stats(), moves: [waitMove] });
    // Normal target: Fighting super-effective, frail → would be OHKO'd from full.
    const mkFoe = (item: string) =>
      foes(
        withItem(combatant({ name: "T", types: ["normal"], base: stats({ hp: 100, def: 50 }), moves: [waitMove] }), item),
        combatant({ name: "F2", types: ["normal"], base: stats(), moves: [waitMove] }),
      );
    const withSash = applyTurn(
      battleState([a, p], mkFoe("Focus Sash")),
      [userMove(0, "Nuke"), wait(1, "user")],
      [wait(0, "opponent"), wait(1, "opponent")],
      makeRng(5),
    );
    const noSash = applyTurn(
      battleState([a, p], mkFoe("None")),
      [userMove(0, "Nuke"), wait(1, "user")],
      [wait(0, "opponent"), wait(1, "opponent")],
      makeRng(5),
    );
    expect(noSash.state.opponent.active[0]!.fainted).toBe(true);
    const survivor = withSash.state.opponent.active[0]!;
    expect(survivor.fainted).toBe(false);
    expect(survivor.currentHp).toBe(1);
    expect(survivor.item).toBeNull();
  });
});
