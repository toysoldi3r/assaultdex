import { describe, expect, it } from "vitest";
import type { PokemonSet } from "@/domain/types/pokemon";
import { formatShowdownSet, parseShowdownTeam } from "../showdown";

const pelipper: PokemonSet = {
  species: "pelipper",
  level: 50,
  ability: "Drizzle",
  item: "Damp Rock",
  nature: "Calm",
  moves: ["Hurricane", "Hydro Pump", "Tailwind", "Protect"],
  spread: {
    ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
  },
};

describe("Showdown format", () => {
  it("round-trips a set through format -> parse", () => {
    const text = formatShowdownSet(pelipper, "Pelipper");
    const [parsed] = parseShowdownTeam(text);
    expect(parsed).toBeDefined();
    expect(parsed!.speciesName).toBe("Pelipper");
    expect(parsed!.item).toBe("Damp Rock");
    expect(parsed!.ability).toBe("Drizzle");
    expect(parsed!.level).toBe(50);
    expect(parsed!.nature).toBe("Calm");
    expect(parsed!.moves).toEqual(["Hurricane", "Hydro Pump", "Tailwind", "Protect"]);
    expect(parsed!.evs.hp).toBe(252);
    expect(parsed!.evs.spd).toBe(252);
    expect(parsed!.evs.def).toBe(4);
    expect(parsed!.ivs.atk).toBe(0);
    expect(parsed!.ivs.spe).toBe(31);
  });

  it("parses a nickname, gender marker, and multiple sets", () => {
    const text = [
      "Sharky (Great Tusk) (M) @ Booster Energy",
      "Ability: Protosynthesis",
      "Level: 50",
      "EVs: 252 Atk / 4 Def / 252 Spe",
      "Jolly Nature",
      "- Headlong Rush",
      "- Close Combat",
      "",
      "Pelipper @ Focus Sash",
      "- Hurricane",
    ].join("\n");
    const sets = parseShowdownTeam(text);
    expect(sets).toHaveLength(2);
    expect(sets[0]!.speciesName).toBe("Great Tusk");
    expect(sets[0]!.item).toBe("Booster Energy");
    expect(sets[0]!.nature).toBe("Jolly");
    expect(sets[0]!.evs.spe).toBe(252);
    expect(sets[1]!.speciesName).toBe("Pelipper");
    expect(sets[1]!.moves).toEqual(["Hurricane"]);
  });

  it("caps moves at 4 and ignores unknown natures", () => {
    const text = [
      "Ditto",
      "Bogus Nature",
      "- A", "- B", "- C", "- D", "- E",
    ].join("\n");
    const [set] = parseShowdownTeam(text);
    expect(set!.moves).toEqual(["A", "B", "C", "D"]);
    expect(set!.nature).toBe("Serious");
  });
});
