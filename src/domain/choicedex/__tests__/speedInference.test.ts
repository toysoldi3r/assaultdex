import { describe, expect, it } from "vitest";
import { inferSpeed, speedCandidates } from "../speedInference";

// Chien-Pao base Speed 135 as a concrete example.
const BASE = 135;

describe("[provisional] speed inference", () => {
  it("enumerates the full spread grid", () => {
    const grid = speedCandidates(BASE, 50);
    // 3 natures × 2 IVs × 64 EV steps (0..252 by 4).
    expect(grid).toHaveLength(3 * 2 * 64);
  });

  it("with no observations, min < max and max investment is possible", () => {
    const inf = inferSpeed(BASE, [], 50);
    expect(inf.remaining).toBe(inf.total);
    expect(inf.minSpeed).not.toBeNull();
    expect(inf.maxSpeed).not.toBeNull();
    expect(inf.minSpeed!).toBeLessThan(inf.maxSpeed!);
    expect(inf.maxInvestmentPossible).toBe(true);
    expect(inf.confidence).toBe(0);
  });

  it("‘faster than X’ raises the minimum and rules out slow spreads", () => {
    const baseInf = inferSpeed(BASE, [], 50);
    const inf = inferSpeed(BASE, [{ kind: "faster-than", speed: 150 }], 50);
    expect(inf.minSpeed!).toBeGreaterThan(150);
    expect(inf.remaining).toBeLessThan(baseInf.remaining);
    expect(inf.eliminated).toBeGreaterThan(0);
    expect(inf.confidence).toBeGreaterThan(0);
  });

  it("‘slower than X’ caps the maximum and rules out max investment", () => {
    const inf = inferSpeed(BASE, [{ kind: "slower-than", speed: 160 }], 50);
    expect(inf.maxSpeed!).toBeLessThan(160);
    expect(inf.maxInvestmentPossible).toBe(false);
  });

  it("combined bounds narrow the range from both ends", () => {
    const inf = inferSpeed(
      BASE,
      [
        { kind: "faster-than", speed: 130 },
        { kind: "slower-than", speed: 175 },
      ],
      50,
    );
    expect(inf.minSpeed!).toBeGreaterThan(130);
    expect(inf.maxSpeed!).toBeLessThan(175);
    expect(inf.remaining).toBeGreaterThan(0);
  });

  it("carries the (non-usage) prior assumption", () => {
    expect(inferSpeed(BASE, [], 50).assumptions).toContain("spreadGridPrior");
  });
});
