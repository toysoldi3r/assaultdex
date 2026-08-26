// Server-side catalogs from @pkmn/dex for the teambuilder selectors: the full
// item list plus description lookups for abilities and moves. Passed to the
// client so the picker panels can show a description next to every option.

import { Dex } from "@pkmn/dex";
import type { MoveFixture, MoveTarget, PokemonType } from "@/domain/types/pokemon";

export interface CatalogEntry {
  name: string;
  desc: string;
}

// Runtime @pkmn/dex → MoveFixture, mirroring scripts/generateFixtures.ts so
// ChoiceDex can build a battle fixture for any legal move (not only the curated
// subset baked into a species' `moves`).
const TARGET_MAP: Record<string, MoveTarget> = {
  normal: "normal", any: "normal", randomNormal: "normal", scripted: "normal", adjacentFoe: "normal",
  allAdjacentFoes: "all-adjacent-foes", allAdjacent: "all-adjacent",
  self: "self", adjacentAlly: "ally", adjacentAllyOrSelf: "self",
  allySide: "self", allyTeam: "self", foeSide: "self", all: "self",
};
const STATUS_MAP: Record<string, "burn" | "paralysis" | "poison" | "toxic" | "sleep" | "freeze"> = {
  brn: "burn", par: "paralysis", psn: "poison", tox: "toxic", slp: "sleep", frz: "freeze",
};
const RELEVANT_FLAGS = new Set(["contact", "punch", "sound", "bullet", "bite", "pulse", "slicing"]);

export function moveFixtureFromDex(name: string): MoveFixture | null {
  const m = Dex.moves.get(name);
  if (!m.exists) return null;
  const mm = m as unknown as {
    overrideOffensiveStat?: string; overrideDefensiveStat?: string; overrideOffensivePokemon?: string;
    multihit?: number | [number, number]; flags?: Record<string, unknown>;
    secondary?: { chance?: number; status?: string; volatileStatus?: string; boosts?: Record<string, number> } | null;
    self?: { boosts?: Record<string, number> } | null;
  };
  const isStatus = m.category === "Status" || !m.basePower;
  const out: MoveFixture = {
    name: m.name,
    type: m.type.toLowerCase() as PokemonType,
    category: m.category.toLowerCase() as MoveFixture["category"],
    power: isStatus ? null : m.basePower,
    accuracy: m.accuracy === true ? null : m.accuracy,
    priority: m.priority,
    target: TARGET_MAP[m.target] ?? "normal",
  };
  if (mm.overrideOffensiveStat && mm.overrideOffensiveStat !== "atk" && mm.overrideOffensiveStat !== "spa") {
    out.overrideOffensiveStat = mm.overrideOffensiveStat as MoveFixture["overrideOffensiveStat"];
  }
  if (mm.overrideDefensiveStat === "def" || mm.overrideDefensiveStat === "spd") out.overrideDefensiveStat = mm.overrideDefensiveStat;
  if (mm.overrideOffensivePokemon === "target") out.useTargetOffense = true;
  if (mm.multihit) {
    const h = Array.isArray(mm.multihit) ? Math.round((mm.multihit[0] + mm.multihit[1]) / 2) : mm.multihit;
    if (h > 1) out.hits = h;
  }
  const flags = Object.keys(mm.flags ?? {}).filter((f) => RELEVANT_FLAGS.has(f));
  if (flags.length > 0) out.flags = flags;
  const stageOnly = (b?: Record<string, number>) => {
    if (!b) return undefined;
    const keep: Record<string, number> = {};
    for (const k of ["atk", "def", "spa", "spd", "spe"]) if (typeof b[k] === "number") keep[k] = b[k];
    return Object.keys(keep).length > 0 ? keep : undefined;
  };
  const sec = mm.secondary;
  if (sec && sec.chance) {
    const secondary: NonNullable<MoveFixture["secondary"]> = { chance: sec.chance };
    if (sec.status && STATUS_MAP[sec.status]) secondary.status = STATUS_MAP[sec.status];
    if (sec.volatileStatus === "flinch") secondary.flinch = true;
    const b = stageOnly(sec.boosts);
    if (b) secondary.boosts = b as NonNullable<MoveFixture["secondary"]>["boosts"];
    if (secondary.status || secondary.flinch || secondary.boosts) out.secondary = secondary;
  }
  const self = stageOnly(mm.self?.boosts);
  if (self) out.selfBoosts = self as MoveFixture["selfBoosts"];
  return out;
}

let itemsCache: CatalogEntry[] | null = null;

/** Every usable item (name + one-line effect), sorted. Memoised. */
export function itemCatalog(): CatalogEntry[] {
  if (itemsCache) return itemsCache;
  const out: CatalogEntry[] = [];
  for (const it of Dex.items.all()) {
    if (it.isNonstandard && it.isNonstandard !== "Past") continue;
    out.push({ name: it.name, desc: it.shortDesc || it.desc || "" });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  itemsCache = out;
  return out;
}

export function abilityDescOf(name: string): string {
  const a = Dex.abilities.get(name);
  return a.exists ? a.shortDesc || a.desc || "" : "";
}

export function moveDescOf(name: string): string {
  const m = Dex.moves.get(name);
  return m.exists ? m.shortDesc || m.desc || "" : "";
}

interface DescPool {
  abilities: string[];
  moves: { name: string }[];
}

let descCache: {
  abilityDesc: Record<string, string>;
  moveDesc: Record<string, string>;
} | null = null;

/**
 * Ability/move description maps over the teambuilder pool. The pool is static
 * (the Champions roster), so this is built once and reused across requests
 * instead of re-running hundreds of @pkmn/dex lookups on every team page load.
 */
export function poolDescMaps(pool: DescPool[]) {
  if (descCache) return descCache;
  const abilityDesc: Record<string, string> = {};
  const moveDesc: Record<string, string> = {};
  for (const p of pool) {
    for (const a of p.abilities) abilityDesc[a] ??= abilityDescOf(a);
    for (const m of p.moves) moveDesc[m.name] ??= moveDescOf(m.name);
  }
  descCache = { abilityDesc, moveDesc };
  return descCache;
}
