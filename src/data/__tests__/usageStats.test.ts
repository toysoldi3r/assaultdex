import { describe, expect, it } from "vitest";
import snapshot from "../fixtures/usage/gen9championsvgc2026regmbbo3.json";
import { usageDataSchema } from "../schemas/usage";
import { topMeta, getUsageRank, getRankedCount } from "../usageStats";

describe("usage stats snapshot", () => {
  it("is validated before runtime helpers use it", () => {
    expect(() => usageDataSchema.parse(snapshot)).not.toThrow();
    expect(topMeta(1)).toHaveLength(1);
  });

  it("ranks the most-used Pokémon #1 and matches the usage order", () => {
    const top = topMeta(1)[0]!;
    expect(getUsageRank(top.name)).toBe(1);
    expect(getRankedCount()).toBeGreaterThan(0);
    // Second-most-used ranks 2 (strictly after #1).
    const top2 = topMeta(2);
    if (top2.length === 2) expect(getUsageRank(top2[1]!.name)).toBe(2);
    expect(getUsageRank("Not A Real Pokemon")).toBeNull();
  });

  it("rejects malformed percentages", () => {
    expect(() => usageDataSchema.parse({
      format: "x",
      totalBattles: 1,
      mons: { bad: { name: "Bad", usage: 101, winRate: 50, teammates: [] } },
    })).toThrow();
  });
});
