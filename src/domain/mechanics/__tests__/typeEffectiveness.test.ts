import { describe, expect, it } from "vitest";
import { typeEffectiveness } from "../typeEffectiveness";

// [provisional] — asserts values from the unverified Champions type chart.
describe("[provisional] typeEffectiveness", () => {
  it("single super-effective matchup", () => {
    expect(typeEffectiveness("fire", ["grass"]).multiplier).toBe(2);
    expect(typeEffectiveness("fire", ["grass"]).label).toBe("super");
  });

  it("single not-very-effective matchup", () => {
    expect(typeEffectiveness("water", ["grass"]).multiplier).toBe(0.5);
    expect(typeEffectiveness("water", ["grass"]).label).toBe("resist");
  });

  it("immunity", () => {
    expect(typeEffectiveness("ground", ["flying"]).multiplier).toBe(0);
    expect(typeEffectiveness("normal", ["ghost"]).multiplier).toBe(0);
    expect(typeEffectiveness("electric", ["ground"]).label).toBe("immune");
  });

  it("dual-type stacks multipliers (4x)", () => {
    // Ice vs Ground/Flying (Landorus-Therian): 2 * 2 = 4.
    expect(typeEffectiveness("ice", ["ground", "flying"]).multiplier).toBe(4);
    expect(typeEffectiveness("ice", ["ground", "flying"]).label).toBe(
      "double-super",
    );
  });

  it("dual-type can cancel to neutral", () => {
    // Fire vs Water/Fire: 0.5 * 0.5 = 0.25 (double resist).
    expect(typeEffectiveness("fire", ["water", "fire"]).multiplier).toBe(0.25);
    expect(typeEffectiveness("fire", ["water", "fire"]).label).toBe(
      "double-resist",
    );
  });

  it("carries the typeChart assumption", () => {
    expect(typeEffectiveness("fire", ["grass"]).assumptions).toContain(
      "typeChart",
    );
  });
});
