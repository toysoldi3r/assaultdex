// Server-side catalogs from @pkmn/dex for the teambuilder selectors: the full
// item list plus description lookups for abilities and moves. Passed to the
// client so the picker panels can show a description next to every option.

import { Dex } from "@pkmn/dex";

export interface CatalogEntry {
  name: string;
  desc: string;
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
