import { describe, expect, it } from "vitest";
import { Dex } from "@pkmn/dex";
import fixture from "../fixtures/pokemon.json";
import usage from "../fixtures/usage/gen9championsvgc2026regmbbo3.json";

// Invariant: every Pokémon that actually appears in the committed Champions
// usage snapshot (i.e. was seen in real ladder battles) must be in the generated
// pool. This guards against roster drift — if a future usage refresh introduces
// a species the roster doesn't cover, this fails instead of silently shipping a
// gap in the team builder / calculator.
describe("Champions pool covers ladder-observed Pokémon", () => {
  const poolIds = new Set(
    (fixture as { pokemon: { external_id: string }[] }).pokemon.map((p) => p.external_id),
  );
  const usageMons = Object.values(
    (usage as { mons: Record<string, { name: string }> }).mons,
  );

  it("includes every species seen in the usage snapshot", () => {
    const missing = usageMons
      .map((m) => ({ name: m.name, id: Dex.species.get(m.name).id }))
      .filter((m) => m.id && !poolIds.has(m.id))
      .map((m) => m.name)
      .sort();
    expect(missing).toEqual([]);
  });
});
