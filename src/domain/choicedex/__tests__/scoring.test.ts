import { describe, expect, it } from "vitest";
import { PROFILE_WEIGHTS, scoreFactors } from "../scoring";

describe("scoreFactors", () => {
  const sample = {
    expectedDamage: { raw: 100, normalized: 0.5 },
    koProbability: { raw: 0.2, normalized: 0.2 },
    speedControl: { raw: 1, normalized: 1 },
    typeAdvantage: { raw: 2, normalized: 0.5 },
  };

  it("keeps each factor's contribution separately and sums to total", () => {
    const b = scoreFactors(sample, PROFILE_WEIGHTS.balanced);
    expect(b.factors).toHaveLength(4);
    const sum = b.factors.reduce((a, f) => a + f.contribution, 0);
    expect(b.total).toBeCloseTo(sum, 5);
    expect(b.total).toBeGreaterThanOrEqual(0);
    expect(b.total).toBeLessThanOrEqual(1);
  });

  it("profiles reweight without changing the underlying normalized values", () => {
    const balanced = scoreFactors(sample, PROFILE_WEIGHTS.balanced);
    const maxDamage = scoreFactors(sample, PROFILE_WEIGHTS.maxDamage);
    const dmgBalanced = balanced.factors.find((f) => f.name === "expectedDamage")!;
    const dmgMax = maxDamage.factors.find((f) => f.name === "expectedDamage")!;
    expect(dmgMax.normalized).toBe(dmgBalanced.normalized); // same mechanics
    expect(dmgMax.weight).toBeGreaterThan(dmgBalanced.weight); // different weight
  });
});
