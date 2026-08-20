import { describe, expect, it } from "vitest";
import { DEFAULT_FIELD } from "../../types/battle";
import { combatant, stats } from "../../__tests__/helpers";
import { effectiveSpeed, moveOrder, stageMultiplier } from "../speed";

describe("stageMultiplier", () => {
  it("neutral, positive, negative stages", () => {
    expect(stageMultiplier(0)).toBe(1);
    expect(stageMultiplier(2)).toBe(2);
    expect(stageMultiplier(-2)).toBe(0.5);
  });
  it("clamps beyond ±6", () => {
    expect(stageMultiplier(10)).toBe(stageMultiplier(6));
  });
});

// [provisional] - paralysis modifier is unverified for Champions.
describe("[provisional] effectiveSpeed", () => {
  it("halves speed under paralysis", () => {
    const fast = combatant({ name: "Fast", types: ["normal"], base: stats({ spe: 200 }) });
    const base = effectiveSpeed(fast).effectiveSpeed;
    const para = effectiveSpeed({ ...fast, status: "paralysis" }).effectiveSpeed;
    expect(para).toBe(Math.floor(base * 0.5));
  });

  it("Quick Feet ignores the paralysis drop instead of stacking with it", () => {
    const mon = combatant({ name: "QF", types: ["normal"], base: stats({ spe: 200 }) });
    const plain = effectiveSpeed(mon).effectiveSpeed;
    const qfPara = effectiveSpeed({
      ...mon,
      ability: "Quick Feet",
      status: "paralysis",
    }).effectiveSpeed;
    // 1.5x boost, no 0.5x penalty - so faster than base, not 0.75x slower.
    expect(qfPara).toBe(Math.floor(plain * 1.5));
    expect(qfPara).toBeGreaterThan(plain);
  });
});

describe("moveOrder", () => {
  const field = DEFAULT_FIELD;

  it("higher priority always moves first", () => {
    const r = moveOrder({ speed: 10, priority: 1 }, { speed: 999, priority: 0 }, field);
    expect(r.first).toBe("a");
    expect(r.probabilityAFirst).toBe(1);
  });

  it("faster wins at equal priority", () => {
    const r = moveOrder({ speed: 120, priority: 0 }, { speed: 100, priority: 0 }, field);
    expect(r.first).toBe("a");
  });

  it("true speed tie is 50/50", () => {
    const r = moveOrder({ speed: 100, priority: 0 }, { speed: 100, priority: 0 }, field);
    expect(r.first).toBe("tie");
    expect(r.probabilityAFirst).toBe(0.5);
  });

  it("Trick Room reverses the speed comparison", () => {
    const r = moveOrder(
      { speed: 120, priority: 0 },
      { speed: 100, priority: 0 },
      { ...field, trickRoom: true },
    );
    expect(r.first).toBe("b");
  });
});
