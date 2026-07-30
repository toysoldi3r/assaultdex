import { describe, expect, it } from "vitest";
import { battleState, combatant, stats } from "../../__tests__/helpers";
import type { Combatant } from "../../types/battle";
import { applyEntryEffects } from "../entry";

const withAbility = (c: Combatant, ability: string): Combatant => ({ ...c, ability });

function pair(ability?: string): [Combatant, Combatant] {
  const a = combatant({ name: "A", types: ["normal"], base: stats() });
  const b = combatant({ name: "B", types: ["normal"], base: stats() });
  return [ability ? withAbility(a, ability) : a, b];
}

describe("applyEntryEffects", () => {
  it("Intimidate lowers both opposing actives' Attack by 1", () => {
    const [u0, u1] = pair("Intimidate");
    const [o0, o1] = pair();
    const { state, log } = applyEntryEffects(battleState([u0, u1], [o0, o1]));
    expect(state.opponent.active[0]!.stages.atk).toBe(-1);
    expect(state.opponent.active[1]!.stages.atk).toBe(-1);
    expect(state.user.active[0]!.stages.atk).toBe(0);
    expect(log.some((l) => l.includes("Intimidate"))).toBe(true);
  });

  it("Intimidate is blocked by Clear Body", () => {
    const [u0, u1] = pair("Intimidate");
    const o0 = withAbility(combatant({ name: "O0", types: ["normal"], base: stats() }), "Clear Body");
    const o1 = combatant({ name: "O1", types: ["normal"], base: stats() });
    const { state } = applyEntryEffects(battleState([u0, u1], [o0, o1]));
    expect(state.opponent.active[0]!.stages.atk).toBe(0);
    expect(state.opponent.active[1]!.stages.atk).toBe(-1);
  });

  it("a weather setter fills an unset field but not a manual one", () => {
    const [u0, u1] = pair("Drizzle");
    const [o0, o1] = pair();
    const auto = applyEntryEffects(battleState([u0, u1], [o0, o1]));
    expect(auto.state.field.weather).toBe("rain");

    const manual = applyEntryEffects(
      battleState([u0, u1], [o0, o1], { field: { weather: "sun" } }),
    );
    expect(manual.state.field.weather).toBe("sun");
  });

  it("a terrain setter fills an unset terrain", () => {
    const [u0, u1] = pair("Grassy Surge");
    const [o0, o1] = pair();
    const { state } = applyEntryEffects(battleState([u0, u1], [o0, o1]));
    expect(state.field.terrain).toBe("grassy");
  });
});
