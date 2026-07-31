import { describe, expect, it } from "vitest";
import { pokeApiProvider } from "../providers/pokeApiProvider";

// A trimmed but shape-accurate PokéAPI /pokemon/garchomp response.
const SAMPLE = {
  name: "garchomp",
  types: [
    { slot: 2, type: { name: "ground" } },
    { slot: 1, type: { name: "dragon" } },
  ],
  stats: [
    { base_stat: 108, stat: { name: "hp" } },
    { base_stat: 130, stat: { name: "attack" } },
    { base_stat: 95, stat: { name: "defense" } },
    { base_stat: 80, stat: { name: "special-attack" } },
    { base_stat: 85, stat: { name: "special-defense" } },
    { base_stat: 102, stat: { name: "speed" } },
  ],
  abilities: [
    { ability: { name: "sand-veil" }, is_hidden: false },
    { ability: { name: "rough-skin" }, is_hidden: true },
  ],
};

describe("PokeApiProvider", () => {
  it("validates and normalizes stats + types (slot order preserved)", () => {
    const raw = pokeApiProvider.validate(SAMPLE);
    const ref = pokeApiProvider.normalize(raw, "2026-07-29T00:00:00.000Z");
    expect(ref.slug).toBe("garchomp");
    expect(ref.types).toEqual(["dragon", "ground"]); // slot 1 then slot 2
    expect(ref.baseStats).toEqual({
      hp: 108,
      atk: 130,
      def: 95,
      spa: 80,
      spd: 85,
      spe: 102,
    });
    expect(ref.abilities).toEqual(["sand-veil", "rough-skin"]);
    expect(ref.provenance.provider).toBe("pokeapi");
    expect(ref.provenance.dataVersion).toBe("pokeapi-v2");
  });

  it("rejects malformed responses", () => {
    expect(() =>
      pokeApiProvider.validate({ name: "x", types: [], stats: [], abilities: [] }),
    ).toThrow();
  });
});
