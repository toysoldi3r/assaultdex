import { describe, expect, it } from "vitest";
import { battleState, combatant, move, stats } from "../../__tests__/helpers";
import { recommend } from "../recommend";

function stateWithKoOption() {
  const attacker = combatant({
    name: "Chien",
    types: ["ice"],
    base: stats({ atk: 200, spe: 200 }),
    moves: [
      move({ name: "Icicle", type: "ice", power: 120 }),
      move({ name: "Weak Tackle", type: "normal", power: 20 }),
    ],
  });
  const partner = combatant({
    name: "Partner",
    types: ["normal"],
    base: stats(),
    moves: [move({ name: "Support", category: "status", power: null, accuracy: null })],
  });
  const foe1 = combatant({
    name: "Lando",
    types: ["ground", "flying"],
    base: stats({ hp: 60 }),
    hpFraction: 0.4,
    moves: [move({ name: "Quake" })],
  });
  const foe2 = combatant({ name: "Foe2", types: ["rock"], base: stats(), moves: [move({ name: "Slam" })] });
  return battleState([attacker, partner], [foe1, foe2]);
}

describe("recommend", () => {
  it("returns recommendations ranked by total, best first", () => {
    const recs = recommend(stateWithKoOption(), { profile: "balanced", limit: 5 });
    expect(recs.length).toBeGreaterThan(0);
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1]!.breakdown.total).toBeGreaterThanOrEqual(recs[i]!.breakdown.total);
    }
  });

  it("top recommendation carries assumptions and never guarantees the result", () => {
    const [top] = recommend(stateWithKoOption(), { profile: "aggressive" });
    expect(top).toBeDefined();
    expect(top!.assumptions.length).toBeGreaterThan(0);
    // Provisional mechanics cap confidence below 1.
    expect(top!.confidence).toBeLessThan(1);
    expect(top!.explanation.toLowerCase()).toContain("provisional");
  });

  it("aggressive profile favours the super-effective KO move over the weak move", () => {
    const recs = recommend(stateWithKoOption(), { profile: "aggressive" });
    const top = recs[0]!;
    const usesIcicle = top.damage.some((d) => d.moveName === "Icicle");
    expect(usesIcicle).toBe(true);
  });
});
