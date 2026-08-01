// Full-national-dex source for the Pokédex tab, read straight from @pkmn/dex
// (~1500 species incl. formes). Deliberately decoupled from the curated
// fixture/DB that powers the team builder and choicedex sim — the Pokédex is a
// reference view of every species, the builder stays scoped to the format's
// legal set. Server-only (imports @pkmn/dex).

import { Dex } from "@pkmn/dex";
import type { PokedexEntry } from "@/components/PokedexBrowser";
import {
  POKEMON_TYPES,
  type MoveCategory,
  type PokemonType,
} from "@/domain/types/pokemon";

function toType(t: string): PokemonType | null {
  const l = t.toLowerCase();
  return (POKEMON_TYPES as readonly string[]).includes(l)
    ? (l as PokemonType)
    : null;
}

function mapTypes(arr: readonly string[]): PokemonType[] {
  return arr.map(toType).filter((x): x is PokemonType => x !== null);
}

interface BaseStatsLike {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

function statsOf(bs: BaseStatsLike) {
  return { hp: bs.hp, atk: bs.atk, def: bs.def, spa: bs.spa, spd: bs.spd, spe: bs.spe };
}

let listCache: PokedexEntry[] | null = null;

/** Every real species (num > 0) as browsable dex entries. Memoised. */
export function listDexEntries(): PokedexEntry[] {
  if (listCache) return listCache;
  const out: PokedexEntry[] = [];
  for (const s of Dex.species.all()) {
    if (s.num <= 0) continue;
    const types = mapTypes(s.types);
    if (types.length === 0) continue;
    out.push({
      slug: s.id,
      name: s.name,
      num: s.num,
      types,
      abilities: Object.values(s.abilities),
      baseStats: statsOf(s.baseStats),
    });
  }
  listCache = out;
  return out;
}

export interface DexMoveRow {
  name: string;
  type: PokemonType | null;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string | null;
}

export interface DexSpecies {
  slug: string;
  name: string;
  num: number;
  types: PokemonType[];
  baseStats: ReturnType<typeof statsOf>;
  abilities: string[];
  /** Gen 9-legal movepool as a full move table (pokemondb.net style). */
  moves: DexMoveRow[];
}

/** Detail for one species by slug (@pkmn id). Null if unknown. */
export async function getDexSpecies(slug: string): Promise<DexSpecies | null> {
  const s = Dex.species.get(slug);
  if (!s.exists || s.num <= 0) return null;

  // Learnsets key off the base species for formes; fall back to it.
  let ls = await Dex.learnsets.get(s.id);
  if ((!ls || !ls.learnset) && s.baseSpecies && s.baseSpecies !== s.name) {
    ls = await Dex.learnsets.get(Dex.species.get(s.baseSpecies).id);
  }

  const moves: DexMoveRow[] = Object.entries(ls?.learnset ?? {})
    .filter(([, src]) => src.some((x) => x.startsWith("9")))
    .map(([id]) => Dex.moves.get(id))
    .filter((m) => m.exists)
    .map((m) => ({
      name: m.name,
      type: toType(m.type),
      category: m.category.toLowerCase() as MoveCategory,
      power: m.category === "Status" ? null : m.basePower || null,
      accuracy: m.accuracy === true ? null : m.accuracy,
      pp: m.pp ?? null,
      effect: m.shortDesc || m.desc || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    slug: s.id,
    name: s.name,
    num: s.num,
    types: mapTypes(s.types),
    baseStats: statsOf(s.baseStats),
    abilities: Object.values(s.abilities),
    moves,
  };
}
