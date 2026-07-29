import { describe, expect, it } from "vitest";
import { DEFAULT_FIELD, NO_SIDE_CONDITIONS } from "../../types/battle";
import { combatant, move, stats } from "../../__tests__/helpers";
import { calculateDamage } from "../damage";
import { effectiveSpeed } from "../speed";
import { isGrounded, terrainMultiplier, weatherMultiplier } from "../field";

const atk = combatant({ name: "A", types: ["fire"], base: stats({ atk: 150, spa: 150 }) });
const grounded = combatant({ name: "G", types: ["normal"], base: stats() });

// [provisional] — all Champions field mechanics are unverified.
describe("[provisional] field mechanics", () => {
  it("grounding: Flying types are not grounded", () => {
    expect(isGrounded(["normal"])).toBe(true);
    expect(isGrounded(["ground", "flying"])).toBe(false);
  });

  it("weather multiplies matching move types", () => {
    expect(weatherMultiplier("fire", "sun")).toBe(1.5);
    expect(weatherMultiplier("water", "sun")).toBe(0.5);
    expect(weatherMultiplier("fire", "rain")).toBe(0.5);
    expect(weatherMultiplier("grass", "sun")).toBe(1);
  });

  it("terrain only boosts grounded users of the matching type", () => {
    expect(terrainMultiplier("electric", "electric", true, true)).toBe(1.3);
    expect(terrainMultiplier("electric", "electric", false, true)).toBe(1);
    expect(terrainMultiplier("dragon", "misty", true, true)).toBe(0.5);
  });

  it("sun boosts a Fire attack's expected damage", () => {
    const none = calculateDamage(atk, grounded, move({ type: "fire", power: 100 }), DEFAULT_FIELD);
    const sun = calculateDamage(atk, grounded, move({ type: "fire", power: 100 }), {
      ...DEFAULT_FIELD,
      weather: "sun",
    });
    expect(sun.expectedDamage).toBeGreaterThan(none.expectedDamage);
    expect(sun.modifiers.some((m) => m.name.startsWith("weather"))).toBe(true);
    expect(sun.assumptions).toContain("weather");
  });

  it("a spread move deals less than the same single-target move", () => {
    const single = calculateDamage(atk, grounded, move({ type: "fire", power: 100, target: "normal" }), DEFAULT_FIELD);
    const spread = calculateDamage(atk, grounded, move({ type: "fire", power: 100, target: "all-adjacent-foes" }), DEFAULT_FIELD);
    expect(spread.expectedDamage).toBeLessThan(single.expectedDamage);
    expect(spread.modifiers.some((m) => m.name === "spread")).toBe(true);
  });

  it("screens reduce damage, and a crit ignores them", () => {
    const phys = move({ type: "normal", power: 100, category: "physical" });
    const noScreen = calculateDamage(atk, grounded, phys, DEFAULT_FIELD);
    const screened = calculateDamage(atk, grounded, phys, DEFAULT_FIELD, {
      defenderConditions: { ...NO_SIDE_CONDITIONS, reflect: true },
    });
    expect(screened.expectedDamage).toBeLessThan(noScreen.expectedDamage);

    const critThroughScreen = calculateDamage(atk, grounded, phys, DEFAULT_FIELD, {
      defenderConditions: { ...NO_SIDE_CONDITIONS, reflect: true },
      crit: true,
    });
    expect(critThroughScreen.expectedDamage).toBeGreaterThan(screened.expectedDamage);
  });

  it("Tailwind doubles effective Speed", () => {
    const base = effectiveSpeed(grounded).effectiveSpeed;
    const tw = effectiveSpeed(grounded, { tailwind: true });
    expect(tw.effectiveSpeed).toBe(base * 2);
    expect(tw.assumptions).toContain("tailwind");
  });
});
