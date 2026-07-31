import { describe, expect, it } from "vitest";
import { battleState, combatant, stats } from "../../__tests__/helpers";
import type { Combatant } from "../../types/battle";
import { applyResidual } from "../residual";

const set = (c: Combatant, patch: Partial<Combatant>): Combatant => ({ ...c, ...patch });

function stateWith(c: Combatant, field?: Parameters<typeof battleState>[2]) {
  const filler = combatant({ name: "F", types: ["normal"], base: stats() });
  return battleState([c, null], [filler, null], field);
}

describe("applyResidual", () => {
  it("burn removes 1/16 max HP", () => {
    const c = set(combatant({ name: "B", types: ["normal"], base: stats({ hp: 160 }) }), { status: "burn" });
    const before = c.currentHp;
    applyResidual(stateWith(c));
    expect(before - c.currentHp).toBe(Math.floor(c.stats.hp / 16));
  });

  it("badly poisoned ramps each turn", () => {
    const c = set(combatant({ name: "T", types: ["normal"], base: stats({ hp: 160 }) }), { status: "toxic" });
    const max = c.stats.hp;
    const s = stateWith(c);
    applyResidual(s);
    expect(max - c.currentHp).toBe(Math.floor((max * 1) / 16));
    expect(c.toxicCounter).toBe(2);
    const afterFirst = c.currentHp;
    applyResidual(s);
    expect(afterFirst - c.currentHp).toBe(Math.floor((max * 2) / 16));
    expect(c.toxicCounter).toBe(3);
  });

  it("Leftovers heals 1/16 when hurt", () => {
    const c = set(combatant({ name: "L", types: ["normal"], base: stats({ hp: 160 }), hpFraction: 0.5 }), { item: "Leftovers" });
    const before = c.currentHp;
    applyResidual(stateWith(c));
    expect(c.currentHp - before).toBe(Math.floor(c.stats.hp / 16));
  });

  it("sandstorm chips non-immune types but not Steel", () => {
    const soft = combatant({ name: "Soft", types: ["normal"], base: stats({ hp: 160 }) });
    const steel = combatant({ name: "Steel", types: ["steel"], base: stats({ hp: 160 }) });
    const st = battleState([soft, null], [steel, null], { field: { weather: "sand" } });
    const softBefore = soft.currentHp;
    const steelBefore = steel.currentHp;
    applyResidual(st);
    expect(softBefore - soft.currentHp).toBe(Math.floor(soft.stats.hp / 16));
    expect(steel.currentHp).toBe(steelBefore);
  });

  it("Perish Song faints when the counter reaches 0", () => {
    const c = set(combatant({ name: "P", types: ["normal"], base: stats() }), { perish: 2 });
    const s = stateWith(c);
    const r1 = applyResidual(s);
    expect(c.perish).toBe(1);
    expect(r1.faints).toBe(0);
    const r2 = applyResidual(s);
    expect(c.fainted).toBe(true);
    expect(r2.faints).toBe(1);
  });

  it("weather countdown expires and clears", () => {
    const c = combatant({ name: "C", types: ["normal"], base: stats() });
    const s = battleState([c, null], [combatant({ name: "F", types: ["normal"], base: stats() }), null], {
      field: { weather: "rain", weatherTurns: 1 },
    });
    applyResidual(s);
    expect(s.field.weather).toBe("none");
  });

  it("Magic Guard ignores residual chip", () => {
    const c = set(combatant({ name: "MG", types: ["normal"], base: stats({ hp: 160 }) }), { status: "burn", ability: "Magic Guard" });
    const before = c.currentHp;
    applyResidual(stateWith(c));
    expect(c.currentHp).toBe(before);
  });
});
