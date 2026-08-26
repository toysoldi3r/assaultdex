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
import { computeStat } from "@/domain/mechanics/stats";
import {
  POKEMON_TYPES,
  STAT_KEYS,
  type MoveCategory,
  type Nature,
  type PokemonType,
  type StatKey,
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

/** How a species learns a move in Gen 9 (parsed from the learnset source codes). */
export type LearnMethod = "level" | "tm" | "egg" | "tutor" | "event";

export interface DexMoveRow {
  name: string;
  type: PokemonType | null;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  /** Turn-order bracket; 0 = normal, positive = moves first (Fake Out, …). */
  priority: number;
  effect: string | null;
  /** Ways this species can learn the move (a move can have several). */
  methods: LearnMethod[];
  /** Lowest level it is learnt at, when learnt by level-up (0 = on evolution). */
  level: number | null;
}

/** Min/max possible value of a stat (pokemondb.net style): min = 0 IV / 0 EV /
 *  hindering nature, max = 31 IV / 252 EV / boosting nature, at the given level. */
export interface StatRange {
  base: number;
  min: number;
  max: number;
}

export interface DexSpecies {
  slug: string;
  name: string;
  num: number;
  types: PokemonType[];
  baseStats: ReturnType<typeof statsOf>;
  abilities: string[];
  /** Weight in kilograms (@pkmn/dex). */
  weightKg: number;
  /** Per-stat min/max at level 100 (the level pokemondb.net tabulates). */
  statRanges: Record<StatKey, StatRange>;
  /** Gen 9-legal movepool as a full move table (pokemondb.net style). */
  moves: DexMoveRow[];
}

const RANGE_LEVEL = 100;

/** A nature that boosts `boost` and lowers `lower` (or neutral when equal). */
function natureFor(boost: StatKey, lower: StatKey): Nature {
  return { name: "range", boosted: boost, lowered: lower };
}

function statRanges(bs: ReturnType<typeof statsOf>): Record<StatKey, StatRange> {
  const out = {} as Record<StatKey, StatRange>;
  for (const k of STAT_KEYS) {
    const other: StatKey = k === "atk" ? "def" : "atk"; // any distinct stat
    // HP ignores nature; for others min uses a hindering nature, max a boosting one.
    const min = computeStat(bs[k], 0, 0, RANGE_LEVEL, k, natureFor(other, k));
    const max = computeStat(bs[k], 31, 252, RANGE_LEVEL, k, natureFor(k, other));
    out[k] = { base: bs[k], min, max };
  }
  return out;
}

/** Parse learnset source codes (e.g. "9L15", "9M", "8E") into methods. `gen`
 *  selects which generation's codes to read; when omitted, the newest
 *  generation present is used (for pre-Gen-9 species not in Scarlet/Violet). */
function parseLearn(codes: string[], gen?: string): { methods: LearnMethod[]; level: number | null } {
  const g = gen ?? String(Math.max(0, ...codes.map((c) => parseInt(c, 10) || 0)));
  const methods = new Set<LearnMethod>();
  let level: number | null = null;
  for (const c of codes) {
    if (c[0] !== g) continue;
    switch (c[1]) {
      case "L": {
        methods.add("level");
        const n = parseInt(c.slice(2), 10);
        if (!Number.isNaN(n)) level = level === null ? n : Math.min(level, n);
        break;
      }
      case "M": methods.add("tm"); break;
      case "E": methods.add("egg"); break;
      case "T": methods.add("tutor"); break;
      case "S": methods.add("event"); break;
      default: break;
    }
  }
  return { methods: [...methods], level };
}

/** Types for a species by slug/usage key, for teammate badges. [] if unknown. */
export function getSpeciesTypes(slug: string): PokemonType[] {
  const s = Dex.species.get(slug);
  return s.exists ? mapTypes(s.types) : [];
}

/** A move's type by name (for usage/move lists), or null if unknown. */
export function moveTypeByName(name: string): PokemonType | null {
  const m = Dex.moves.get(name);
  return m.exists ? toType(m.type) : null;
}

// ---------------------------------------------------------------------------
// Move detail (for the per-move reference page). All from @pkmn/dex; provisional
// for Champions like the rest of the mechanics.
// ---------------------------------------------------------------------------

/** A short description that held from `genFrom` until the next change. */
export interface MoveGenDesc {
  genFrom: number;
  desc: string;
}

export interface MoveDetail {
  name: string;
  type: PokemonType | null;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  priority: number;
  /** Raw @pkmn target id (e.g. "normal", "allAdjacentFoes", "self"). */
  target: string;
  /** Relevant move flags present (contact, protect, mirror, reflectable, …). */
  flags: string[];
  /** Drains HP from the target (Big Root boosts it). */
  drain: boolean;
  /** Already has an inherent flinch chance (so King's Rock adds nothing). */
  flinchAlready: boolean;
  /** shortDesc per generation, collapsed to change points. */
  descByGen: MoveGenDesc[];
}

/** Full reference detail for a move by name, or null if unknown. */
export function getMoveDetail(name: string): MoveDetail | null {
  const m = Dex.moves.get(name);
  if (!m.exists) return null;

  const descByGen: MoveGenDesc[] = [];
  let prev = "";
  for (let g = m.gen || 1; g <= 9; g++) {
    let dg;
    try {
      dg = Dex.forGen(g);
    } catch {
      continue;
    }
    const mg = dg.moves.get(m.id);
    if (!mg.exists) continue;
    const d = mg.shortDesc || mg.desc || "";
    if (!d || d === prev) continue;
    descByGen.push({ genFrom: g, desc: d });
    prev = d;
  }

  const raw = m as unknown as { drain?: unknown; secondary?: { volatileStatus?: string } | null };
  return {
    name: m.name,
    type: toType(m.type),
    category: m.category.toLowerCase() as MoveCategory,
    power: m.category === "Status" ? null : m.basePower || null,
    accuracy: m.accuracy === true ? null : m.accuracy,
    pp: m.pp ?? null,
    priority: m.priority,
    target: m.target,
    flags: Object.keys(m.flags ?? {}),
    drain: Boolean(raw.drain),
    flinchAlready: raw.secondary?.volatileStatus === "flinch",
    descByGen,
  };
}

/** A species that can learn a given move, with how it learns it. */
export interface MoveLearner {
  slug: string;
  name: string;
  num: number;
  types: PokemonType[];
  methods: LearnMethod[];
  champions: boolean;
}

// Reverse learnset index (move id → learners), built once and cached. Scans
// every base species' Gen 9 learnset, so the first move page pays the cost and
// the rest are instant.
let learnerIndex: Promise<Map<string, MoveLearner[]>> | null = null;

async function buildLearnerIndex(): Promise<Map<string, MoveLearner[]>> {
  const map = new Map<string, MoveLearner[]>();
  for (const s of Dex.species.all()) {
    if (!inShowdown(s) || s.baseSpecies !== s.name) continue;
    let ls = await Dex.learnsets.get(s.id);
    if ((!ls || !ls.learnset) && s.baseSpecies) {
      ls = await Dex.learnsets.get(Dex.species.get(s.baseSpecies).id);
    }
    const learn = ls?.learnset;
    if (!learn) continue;
    const types = mapTypes(s.types);
    const champions = CHAMPIONS_BASE.has(s.id);
    for (const [mid, codes] of Object.entries(learn)) {
      // Newest generation the species learns the move in (Gen 9 where present,
      // else the latest available — so pre-SV Champions still list as learners).
      const { methods } = parseLearn(codes);
      if (methods.length === 0) continue;
      const arr = map.get(mid) ?? [];
      arr.push({ slug: s.id, name: s.name, num: s.num, types, methods, champions });
      map.set(mid, arr);
    }
  }
  return map;
}

/** Species that can learn a move (Gen 9), sorted by dex number. Memoised. */
export async function moveLearners(name: string): Promise<MoveLearner[]> {
  const m = Dex.moves.get(name);
  if (!m.exists) return [];
  learnerIndex ??= buildLearnerIndex();
  const map = await learnerIndex;
  return (map.get(m.id) ?? []).slice().sort((a, b) => a.num - b.num);
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

  // Prefer the Gen 9 movepool; but many pre-Gen-9 Champions (Watchog, Absol,
  // Machamp, …) are absent from Scarlet/Violet and carry no "9" learnset codes.
  // For those, fall back to the full learnset so the moves table isn't empty.
  const entries = Object.entries(ls?.learnset ?? {});
  const hasGen9 = entries.some(([, src]) => src.some((x) => x.startsWith("9")));
  const moves: DexMoveRow[] = entries
    .filter(([, src]) => (hasGen9 ? src.some((x) => x.startsWith("9")) : true))
    .map(([id, src]) => ({ move: Dex.moves.get(id), learn: parseLearn(src, hasGen9 ? "9" : undefined) }))
    .filter(({ move }) => move.exists)
    .map(({ move: m, learn }) => ({
      name: m.name,
      type: toType(m.type),
      category: m.category.toLowerCase() as MoveCategory,
      power: m.category === "Status" ? null : m.basePower || null,
      accuracy: m.accuracy === true ? null : m.accuracy,
      pp: m.pp ?? null,
      priority: m.priority ?? 0,
      effect: m.shortDesc || m.desc || null,
      methods: learn.methods,
      level: learn.level,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const baseStats = statsOf(s.baseStats);
  return {
    slug: s.id,
    name: s.name,
    num: s.num,
    types: mapTypes(s.types),
    baseStats,
    abilities: Object.values(s.abilities),
    weightKg: s.weightkg,
    statRanges: statRanges(baseStats),
    moves,
  };
}
