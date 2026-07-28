import { describe, expect, it } from "vitest";
import type { PokemonSet, TeamSnapshot } from "../../types/pokemon";
import { diffSnapshots } from "../versionDiff";

function set(overrides: Partial<PokemonSet> = {}): PokemonSet {
  return {
    species: "incineroar",
    level: 50,
    ability: "Intimidate",
    item: "Assault Vest",
    nature: "Adamant",
    moves: ["Fake Out", "Flare Blitz", "Knock Off", "Parting Shot"],
    spread: {
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
    },
    ...overrides,
  };
}

function snap(members: PokemonSet[]): TeamSnapshot {
  return { members };
}

describe("diffSnapshots", () => {
  it("reports unchanged members", () => {
    const d = diffSnapshots(snap([set()]), snap([set()]));
    expect(d.changedCount).toBe(0);
    expect(d.members[0]!.status).toBe("unchanged");
  });

  it("detects scalar and move changes", () => {
    const d = diffSnapshots(
      snap([set()]),
      snap([set({ item: "Sitrus Berry", moves: ["Fake Out", "Flare Blitz", "U-turn", "Protect"] })]),
    );
    expect(d.changedCount).toBe(1);
    const fields = d.members[0]!.changes.map((c) => c.field);
    expect(fields).toContain("item");
    expect(fields).toContain("moves");
  });

  it("detects added and removed members", () => {
    const d = diffSnapshots(
      snap([set()]),
      snap([set(), set({ species: "rillaboom" })]),
    );
    const added = d.members.find((m) => m.species === "rillaboom");
    expect(added!.status).toBe("added");

    const d2 = diffSnapshots(snap([set(), set({ species: "rillaboom" })]), snap([set()]));
    const removed = d2.members.find((m) => m.species === "rillaboom");
    expect(removed!.status).toBe("removed");
  });
});
