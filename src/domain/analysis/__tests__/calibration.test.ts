import { describe, expect, it } from "vitest";
import { calibrate } from "../calibration";

describe("calibrate", () => {
  it("returns null Brier score and empty sample for no data", () => {
    const c = calibrate([]);
    expect(c.brierScore).toBeNull();
    expect(c.sampleSize).toBe(0);
    expect(c.buckets).toHaveLength(10);
  });

  it("perfect predictions score 0 (Brier)", () => {
    const c = calibrate([
      { predicted: 1, outcome: 1 },
      { predicted: 0, outcome: 0 },
      { predicted: 1, outcome: 1 },
    ]);
    expect(c.brierScore).toBe(0);
  });

  it("worst predictions score 1 (Brier)", () => {
    const c = calibrate([
      { predicted: 1, outcome: 0 },
      { predicted: 0, outcome: 1 },
    ]);
    expect(c.brierScore).toBe(1);
  });

  it("buckets predicted probabilities and computes observed frequency", () => {
    // Ten 0.8 predictions, 6 hits → bucket [0.8,0.9) observed 0.6.
    const pairs = [
      ...Array(6).fill({ predicted: 0.8, outcome: 1 }),
      ...Array(4).fill({ predicted: 0.8, outcome: 0 }),
    ];
    const c = calibrate(pairs);
    const bucket = c.buckets.find((b) => b.lower === 0.8)!;
    expect(bucket.count).toBe(10);
    expect(bucket.predictedMean).toBe(0.8);
    expect(bucket.observedFrequency).toBe(0.6);
  });
});
