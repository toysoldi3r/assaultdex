import { describe, expect, it } from "vitest";
import rosterData from "../fixtures/championsRoster.json";
import fixtureDataset from "../fixtures/pokemon.json";

// Enforces that the fixture set is exactly the authoritative Champions pool -
// no more, no fewer species than the provided roster.
describe("Champions pool ↔ fixtures", () => {
  const roster = rosterData.roster;
  const fixtures = fixtureDataset.pokemon;

  it("has the same number of species as the authoritative roster", () => {
    expect(rosterData.count).toBe(roster.length);
    expect(fixtures.length).toBe(roster.length);
  });

  it("has unique external ids (no duplicate species)", () => {
    const ids = fixtures.map((p) => p.external_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every fixture has stats, types, abilities, a movepool, and moves", () => {
    for (const p of fixtures) {
      expect(p.types.length).toBeGreaterThanOrEqual(1);
      expect(Object.keys(p.base_stats)).toHaveLength(6);
      expect(p.abilities.length).toBeGreaterThanOrEqual(1);
      expect(p.movepool.length).toBeGreaterThanOrEqual(1);
      expect(p.moves.length).toBeGreaterThanOrEqual(1);
    }
  });
});
