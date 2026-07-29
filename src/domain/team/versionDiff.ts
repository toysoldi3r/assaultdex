// Pure diff between two team-version snapshots. Used to compare versions
// (spec: "View, compare, and restore team versions").

import type { PokemonSet, TeamSnapshot } from "../types/pokemon";

export interface SetFieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

export interface MemberDiff {
  species: string;
  status: "added" | "removed" | "changed" | "unchanged";
  changes: SetFieldChange[];
}

export interface SnapshotDiff {
  members: MemberDiff[];
  changedCount: number;
}

function compareSet(a: PokemonSet, b: PokemonSet): SetFieldChange[] {
  const changes: SetFieldChange[] = [];
  const scalarFields: (keyof PokemonSet)[] = [
    "level",
    "ability",
    "item",
    "nature",
  ];
  for (const f of scalarFields) {
    if (a[f] !== b[f]) changes.push({ field: f, from: a[f], to: b[f] });
  }
  if (a.moves.join("|") !== b.moves.join("|")) {
    changes.push({ field: "moves", from: a.moves, to: b.moves });
  }
  if (JSON.stringify(a.spread) !== JSON.stringify(b.spread)) {
    changes.push({ field: "spread", from: a.spread, to: b.spread });
  }
  return changes;
}

/** Diff two snapshots keyed by species. */
export function diffSnapshots(
  from: TeamSnapshot,
  to: TeamSnapshot,
): SnapshotDiff {
  const fromBy = new Map(from.members.map((m) => [m.species, m]));
  const toBy = new Map(to.members.map((m) => [m.species, m]));
  const species = new Set([...fromBy.keys(), ...toBy.keys()]);

  const members: MemberDiff[] = [];
  for (const s of species) {
    const a = fromBy.get(s);
    const b = toBy.get(s);
    if (a && !b) {
      members.push({ species: s, status: "removed", changes: [] });
    } else if (!a && b) {
      members.push({ species: s, status: "added", changes: [] });
    } else if (a && b) {
      const changes = compareSet(a, b);
      members.push({
        species: s,
        status: changes.length ? "changed" : "unchanged",
        changes,
      });
    }
  }

  members.sort((x, y) => x.species.localeCompare(y.species));
  const changedCount = members.filter((m) => m.status !== "unchanged").length;
  return { members, changedCount };
}
