import { describe, expect, it } from "vitest";
import { DEFAULT_FIELD } from "../../types/battle";
import { combatant, move, stats } from "../../__tests__/helpers";
import { buildMatchupMatrix } from "../matchup";

describe("matchup matrix", () => {
  const ice = combatant({
    name: "Ice",
    types: ["ice"],
    base: stats({ atk: 150, spe: 150 }),
    moves: [move({ name: "Icicle", type: "ice", power: 100 })],
  });
  const fire = combatant({
    name: "Fire",
    types: ["fire"],
    base: stats({ atk: 150, spe: 60 }),
    moves: [move({ name: "Flame", type: "fire", power: 100 })],
  });
  const dragon = combatant({ name: "Dragon", types: ["dragon"], base: stats(), moves: [move({ name: "Bite" })] });
  const grass = combatant({ name: "Grass", types: ["grass"], base: stats(), moves: [move({ name: "Vine" })] });

  it("produces an attacker×defender grid with best moves and speed", () => {
    const m = buildMatchupMatrix([ice, fire], [dragon, grass], DEFAULT_FIELD);
    expect(m.attackers).toEqual(["Ice", "Fire"]);
    expect(m.defenders).toEqual(["Dragon", "Grass"]);
    expect(m.cells).toHaveLength(2);
    expect(m.cells[0]).toHaveLength(2);

    // Ice vs Dragon is super-effective and Ice outspeeds neutral 100 base.
    const iceVsDragon = m.cells[0]![0]!;
    expect(iceVsDragon.bestMove).toBe("Icicle");
    expect(iceVsDragon.expectedPercent).toBeGreaterThan(0);
    expect(iceVsDragon.outspeeds).toBe(true);

    // Fire (base 60) does not outspeed neutral 100 base.
    const fireVsGrass = m.cells[1]![1]!;
    expect(fireVsGrass.outspeeds).toBe(false);
  });
});
