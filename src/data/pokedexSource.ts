// Full-national-dex source for the Pokédex tab, read straight from @pkmn/dex
// (~1500 species incl. formes). Deliberately decoupled from the curated
// fixture/DB that powers the team builder and choicedex sim - the Pokédex is a
// reference view of every species, the builder stays scoped to the format's
// legal set. Server-only (imports @pkmn/dex).

import { Dex } from "@pkmn/dex";
import type { PokedexEntry } from "@/components/PokedexBrowser";
import fixtureData from "./fixtures/pokemon.json";

// The Pokémon Champions roster (the curated fixture). We map each entry to its
// BASE species id, so a base shows in Champions mode when any of its formes is
// legal there (e.g. Tauros-Paldea → Tauros); the forme is reached via the
// on-page switcher.
const CHAMPIONS_BASE: Set<string> = (() => {
  const set = new Set<string>();
  for (const p of (fixtureData as { pokemon: { external_id: string }[] }).pokemon) {
    const s = Dex.species.get(p.external_id);
    if (s.exists) set.add(Dex.species.get(s.baseSpecies).id);
  }
  return set;
})();
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

/**
 * True for species Pokémon Showdown actually ships. @pkmn/dex is generated from
 * Showdown's data, so the only non-Showdown entries are fan-made CAP mons
 * (num ≤ 0) and one-off Custom fakemon - everything else (standard, past-gen,
 * LGPE, future/DLC) is in Showdown's dex.
 */
function inShowdown(s: { num: number; isNonstandard: string | null }): boolean {
  if (s.num <= 0) return false;
  if (s.isNonstandard === "CAP" || s.isNonstandard === "Custom") return false;
  return true;
}

let listCache: PokedexEntry[] | null = null;

/** Only base species list (formes like Venusaur-Mega collapse into the base). */
export function listDexEntries(): PokedexEntry[] {
  if (listCache) return listCache;
  const out: PokedexEntry[] = [];
  for (const s of Dex.species.all()) {
    if (!inShowdown(s)) continue;
    if (s.baseSpecies !== s.name) continue; // skip formes; switch them on the page
    const types = mapTypes(s.types);
    if (types.length === 0) continue;
    out.push({
      slug: s.id,
      name: s.name,
      num: s.num,
      types,
      abilities: Object.values(s.abilities),
      baseStats: statsOf(s.baseStats),
      champions: CHAMPIONS_BASE.has(s.id),
    });
  }
  listCache = out;
  return out;
}

export interface SpeciesForm {
  id: string;
  label: string;
  isBase: boolean;
}

/**
 * The switchable forms of a species (base + Mega/regional/Gmax/etc.), given any
 * form's slug. Returns [] when the species has only one form. `id` is the @pkmn
 * id used as the ?form= value; `label` is the forme name ("Mega", "Alola") or
 * "Base".
 */
const formsCache = new Map<string, SpeciesForm[]>();

export function getSpeciesForms(anySlug: string): SpeciesForm[] {
  const cached = formsCache.get(anySlug);
  if (cached) return cached;
  const value = computeSpeciesForms(anySlug);
  formsCache.set(anySlug, value);
  return value;
}

function computeSpeciesForms(anySlug: string): SpeciesForm[] {
  const s = Dex.species.get(anySlug);
  if (!s.exists) return [];
  const base = Dex.species.get(s.baseSpecies);
  const names = [base.name, ...(base.otherFormes ?? [])];
  const forms: SpeciesForm[] = [];
  for (const name of names) {
    const f = Dex.species.get(name);
    if (!f.exists || (f.isNonstandard === "CAP" || f.isNonstandard === "Custom")) continue;
    forms.push({ id: f.id, label: f.forme || "Base", isBase: f.name === base.name });
  }
  return forms.length > 1 ? forms : [];
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

const speciesCache = new Map<string, DexSpecies | null>();

/** Detail for one species by slug (@pkmn id). Null if unknown. Memoised - the
 *  learnset + dex data are constant for the process. */
export async function getDexSpecies(slug: string): Promise<DexSpecies | null> {
  if (speciesCache.has(slug)) return speciesCache.get(slug)!;
  const value = await computeDexSpecies(slug);
  speciesCache.set(slug, value);
  return value;
}

async function computeDexSpecies(slug: string): Promise<DexSpecies | null> {
  const s = Dex.species.get(slug);
  if (!s.exists || !inShowdown(s)) return null;

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
