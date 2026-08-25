import { describe, expect, it } from "vitest";
import {
  abilityMatchup,
  defensiveChartWithAbility,
  hasMatchupEffect,
} from "../abilityMatchup";

describe("abilityMatchup", () => {
  it("returns null for abilities with no type effect", () => {
    expect(abilityMatchup("Overgrow")).toBeNull();
    expect(hasMatchupEffect("Fur Coat")).toBe(false);
    expect(hasMatchupEffect("Levitate")).toBe(true);
  });

  it("Levitate makes a Ground matchup immune", () => {
    // Charizard (fire/flying) is already immune to ground via Flying, so use a
    // grounded typing: Steelix (steel/ground) is 1x from ground normally.
    const chart = defensiveChartWithAbility(["steel", "ground"], "Levitate");
    expect(chart.ground).toBe(0);
  });

  it("Thick Fat halves Fire and Ice", () => {
    // Normal takes 1x fire/ice; Thick Fat -> 0.5x.
    const chart = defensiveChartWithAbility(["normal"], "Thick Fat");
    expect(chart.fire).toBe(0.5);
    expect(chart.ice).toBe(0.5);
  });

  it("Dry Skin is immune to Water and extra weak to Fire", () => {
    const chart = defensiveChartWithAbility(["normal"], "Dry Skin");
    expect(chart.water).toBe(0);
    expect(chart.fire).toBe(1.25);
  });

  it("Filter dampens super-effective hits only", () => {
    // Grass takes 2x from fire; Filter -> 1.5x. Neutral stays 1x.
    const chart = defensiveChartWithAbility(["grass"], "Filter");
    expect(chart.fire).toBe(1.5);
    expect(chart.water).toBe(0.5); // grass resists water, unchanged
  });

  it("leaves the chart untouched with no ability", () => {
    const base = defensiveChartWithAbility(["grass"], null);
    expect(base.fire).toBe(2);
    expect(base.water).toBe(0.5);
  });
});
