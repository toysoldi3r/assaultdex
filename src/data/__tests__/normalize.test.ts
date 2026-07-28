import { describe, expect, it } from "vitest";
import { fixturePokemonProvider } from "../providers/fixturePokemonProvider";
import { NORMALIZATION_VERSION, normalizePokemon } from "../normalize";
import { rawPokemonDatasetSchema, rawPokemonSchema } from "../schemas/pokemon";
import fixtureDataset from "../fixtures/pokemon.json";

describe("fixture dataset", () => {
  it("passes Zod validation", () => {
    expect(() => rawPokemonDatasetSchema.parse(fixtureDataset)).not.toThrow();
  });
});

describe("normalizePokemon", () => {
  const raw = rawPokemonSchema.parse({
    external_id: "incineroar",
    name: "Incineroar",
    types: ["fire", "dark"],
    base_stats: {
      hp: 95,
      attack: 115,
      defense: 90,
      special_attack: 80,
      special_defense: 90,
      speed: 60,
    },
    moves: [
      { name: "Flare Blitz", type: "fire", category: "physical", power: 120, accuracy: 100, priority: 0 },
    ],
  });

  it("maps external stat names and attaches provenance", () => {
    const p = normalizePokemon(raw, {
      provider: "fixture",
      retrievedAt: "2025-01-01T00:00:00.000Z",
      dataVersion: "fixtures-2025.1",
    });
    expect(p.slug).toBe("incineroar");
    expect(p.baseStats).toEqual({ hp: 95, atk: 115, def: 90, spa: 80, spd: 90, spe: 60 });
    expect(p.provenance.provider).toBe("fixture");
    expect(p.provenance.normalizationVersion).toBe(NORMALIZATION_VERSION);
    expect(p.provenance.updateStatus).toBe("current");
  });

  it("is deterministic for identical input (idempotent id/slug)", async () => {
    const page = await fixturePokemonProvider.fetchPage();
    const a = fixturePokemonProvider.normalize(page.items[0]!, page.dataVersion);
    const b = fixturePokemonProvider.normalize(page.items[0]!, page.dataVersion);
    expect(a.id).toBe(b.id);
    expect(a.slug).toBe(b.slug);
  });
});
