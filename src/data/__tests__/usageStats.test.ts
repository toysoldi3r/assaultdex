import { describe, expect, it } from "vitest";
import snapshot from "../fixtures/usage/gen9championsvgc2026regmbbo3.json";
import { usageDataSchema } from "../schemas/usage";
import { topMeta } from "../usageStats";

describe("usage stats snapshot", () => {
  it("is validated before runtime helpers use it", () => {
    expect(() => usageDataSchema.parse(snapshot)).not.toThrow();
    expect(topMeta(1)).toHaveLength(1);
  });

  it("rejects malformed percentages", () => {
    expect(() => usageDataSchema.parse({
      format: "x",
      totalBattles: 1,
      mons: { bad: { name: "Bad", usage: 101, winRate: 50, teammates: [] } },
    })).toThrow();
  });
});
