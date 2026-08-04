// Server-only enrichment from @pkmn/dex. The curated fixtures carry the data the
// battle/choicedex sim needs; this layer adds display-only extras (gender,
// sprite, ability effects + hidden flag, move PP + effect text) looked up live
// at render so no DB column, migration, or fixture regen is required. Every
// lookup is name-keyed and null-guarded — species the fixtures invent that
// @pkmn doesn't know simply return no extras.

import { Dex } from "@pkmn/dex";
import { STAT_KEYS, STAT_LABELS } from "@/domain/types/pokemon";

export interface AbilityMeta {
  name: string;
  hidden: boolean;
  effect: string | null;
}

export interface SpeciesMeta {
  num: number;
  spriteId: string;
  genderLabel: string;
  abilities: AbilityMeta[];
}

function genderLabel(spriteId: string): string {
  const s = Dex.species.get(spriteId);
  if (s.gender === "N") return "Genderless";
  if (s.gender === "M") return "♂ only";
  if (s.gender === "F") return "♀ only";
  const r = s.genderRatio;
  if (!r) return "—";
  return `♂ ${+(r.M * 100).toFixed(1)}% / ♀ ${+(r.F * 100).toFixed(1)}%`;
}

const metaCache = new Map<string, SpeciesMeta | null>();

/** Look up display extras for a species by its fixture name. Null if unknown.
 *  Memoised — @pkmn/dex data is constant for the process. */
export function speciesMeta(name: string, fixtureAbilities: string[]): SpeciesMeta | null {
  const key = `${name}|${fixtureAbilities.join(",")}`;
  const cached = metaCache.get(key);
  if (cached !== undefined) return cached;
  const value = computeSpeciesMeta(name, fixtureAbilities);
  metaCache.set(key, value);
  return value;
}

function computeSpeciesMeta(name: string, fixtureAbilities: string[]): SpeciesMeta | null {
  const s = Dex.species.get(name);
  if (!s.exists) return null;

  const hiddenName = s.abilities.H;
  const abilities: AbilityMeta[] = fixtureAbilities.map((a) => {
    const ab = Dex.abilities.get(a);
    return {
      name: a,
      hidden: !!hiddenName && ab.exists && ab.name === hiddenName,
      effect: ab.exists ? ab.shortDesc || ab.desc || null : null,
    };
  });

  return {
    num: s.num,
    spriteId: s.id,
    genderLabel: genderLabel(s.id),
    abilities,
  };
}

export interface GenChange {
  gen: number;
  changes: string[];
}


/**
 * Competitively relevant cross-generation changes for a species: base-stat,
 * typing, and ability revisions. Diffed from the generation the species was
 * introduced (earlier gens return modern data in @pkmn/dex, so they're skipped)
 * up to the current one.
 */
const historyCache = new Map<string, GenChange[]>();

/** Memoised wrapper — the 9-generation diff is deterministic per species. */
export function changeHistory(name: string): GenChange[] {
  const cached = historyCache.get(name);
  if (cached) return cached;
  const value = computeChangeHistory(name);
  historyCache.set(name, value);
  return value;
}

function computeChangeHistory(name: string): GenChange[] {
  const base = Dex.species.get(name);
  if (!base.exists) return [];

  const out: GenChange[] = [];
  let prev: ReturnType<typeof Dex.species.get> | null = null;

  for (let g = base.gen; g <= 9; g++) {
    let dex;
    try {
      dex = Dex.forGen(g);
    } catch {
      continue;
    }
    const s = dex.species.get(name);
    if (!s.exists) continue;

    if (prev) {
      const changes: string[] = [];

      for (const k of STAT_KEYS) {
        const a = prev.baseStats[k];
        const b = s.baseStats[k];
        if (a !== b) {
          changes.push(`${STAT_LABELS[k]} ${a}→${b} (${b > a ? "+" : ""}${b - a})`);
        }
      }

      const prevTypes = prev.types.join("/");
      const nowTypes = s.types.join("/");
      if (prevTypes !== nowTypes) changes.push(`Type ${prevTypes} → ${nowTypes}`);

      const prevAb = new Set(Object.values(prev.abilities));
      const nowAb = Object.values(s.abilities);
      const added = nowAb.filter((a) => !prevAb.has(a));
      const removed = [...prevAb].filter((a) => !nowAb.includes(a));
      if (added.length) changes.push(`Gained ability ${added.join(", ")}`);
      if (removed.length) changes.push(`Lost ability ${removed.join(", ")}`);

      if (changes.length) out.push({ gen: g, changes });
    }
    prev = s;
  }

  return out;
}
