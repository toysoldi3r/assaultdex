import { describe, expect, it } from "vitest";
import { buildDashboard, type BattleSummary } from "../dashboard";

function summary(overrides: Partial<BattleSummary> = {}): BattleSummary {
  return {
    result: "win",
    decisionQuality: 0.9,
    missedKos: 1,
    turningPoints: 2,
    turns: 5,
    koCalibration: [{ predicted: 0.8, outcome: 1 }],
    ...overrides,
  };
}

describe("buildDashboard", () => {
  it("flags a small sample and computes win rate over decisive games", () => {
    const d = buildDashboard([
      summary({ result: "win" }),
      summary({ result: "loss" }),
      summary({ result: "timeout" }),
    ]);
    expect(d.battles).toBe(3);
    expect(d.decisiveGames).toBe(2);
    expect(d.winRate).toBe(0.5);
    expect(d.smallSample).toBe(true);
  });

  it("aggregates mistakes and calibration across battles", () => {
    const d = buildDashboard([summary(), summary({ missedKos: 2 })]);
    expect(d.totalMissedKos).toBe(3);
    expect(d.totalTurningPoints).toBe(4);
    expect(d.koCalibration.sampleSize).toBe(2);
  });

  it("handles an empty history", () => {
    const d = buildDashboard([]);
    expect(d.battles).toBe(0);
    expect(d.winRate).toBeNull();
    expect(d.koCalibration.brierScore).toBeNull();
  });
});
