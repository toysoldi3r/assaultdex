// Server-only enrichment from @pkmn/dex. The curated fixtures carry the data the
// battle/choicedex sim needs; this layer adds display-only extras (gender,
// sprite, ability effects + hidden flag, move PP + effect text) looked up live
// at render so no DB column, migration, or fixture regen is required. Every
// lookup is name-keyed and null-guarded — species the fixtures invent that
// @pkmn doesn't know simply return no extras.

import { Dex } from "@pkmn/dex";

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

export interface MoveMeta {
  pp: number | null;
  effect: string | null;
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

/** Look up display extras for a species by its fixture name. Null if unknown. */
export function speciesMeta(name: string, fixtureAbilities: string[]): SpeciesMeta | null {
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

/** Sprite served by Showdown's CDN (loads in the user's browser). The dex set
 *  covers every generation, unlike the gen-specific folders. */
export function spriteUrl(spriteId: string): string {
  return `https://play.pokemonshowdown.com/sprites/dex/${spriteId}.png`;
}

/** PP + one-line effect for a move by name. Null fields if unknown. */
export function moveMeta(name: string): MoveMeta {
  const m = Dex.moves.get(name);
  if (!m.exists) return { pp: null, effect: null };
  return { pp: m.pp ?? null, effect: m.shortDesc || m.desc || null };
}
