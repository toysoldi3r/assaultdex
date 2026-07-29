import { describe, expect, it } from "vitest";
import {
  confirm,
  createDistribution,
  eliminate,
  liveCandidates,
} from "../inference";

describe("possibility distribution", () => {
  it("starts uniform", () => {
    const d = createDistribution(["a", "b", "c", "d"]);
    expect(d.candidates).toHaveLength(4);
    expect(d.candidates[0]!.prior).toBeCloseTo(0.25, 5);
    expect(d.confidence).toBe(0);
  });

  it("confirm makes one certain and all others impossible", () => {
    const d = confirm(createDistribution(["a", "b", "c"]), (v) => v === "b", "revealed b");
    expect(liveCandidates(d)).toHaveLength(1);
    expect(d.candidates.find((c) => c.value === "b")!.current).toBe(1);
    expect(d.confidence).toBe(1);
    expect(d.tier).toBe("confirmed");
    expect(d.supporting[0]!.description).toBe("revealed b");
  });

  it("eliminate removes impossible candidates and renormalizes", () => {
    const d = eliminate(
      createDistribution(["a", "b", "c", "d"]),
      (v) => v === "a" || v === "b",
      "damage rules out a, b",
    );
    const live = liveCandidates(d);
    expect(live).toHaveLength(2);
    const mass = live.reduce((s, c) => s + c.current, 0);
    expect(mass).toBeCloseTo(1, 5);
    expect(d.tier).toBe("inferred");
    expect(d.contradictory[0]!.weight).toBe(2);
  });

  it("never removes a possibility without confirmed evidence", () => {
    const d = eliminate(createDistribution(["a", "b"]), () => false, "no-op");
    expect(liveCandidates(d)).toHaveLength(2);
  });

  it("confirming a value that is not a candidate leaves the distribution intact", () => {
    // Regression: previously this eliminated every candidate.
    const d = confirm(createDistribution(["a", "b", "c"]), (v) => v === "z", "revealed z");
    expect(liveCandidates(d)).toHaveLength(3);
    expect(d.tier).toBe("unknown");
  });
});
