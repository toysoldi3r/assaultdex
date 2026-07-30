// Core domain types for Pokémon reference data and sets.
//
// These are pure data shapes with no I/O. Values entered here (base stats,
// types) are documented public Pokédex data used as fixtures; move power and
// accuracy are provisional for Pokémon Champions (see mechanics/assumptions).

export const POKEMON_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

export const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export type BaseStats = Record<StatKey, number>;

export type MoveCategory = "physical" | "special" | "status";

/**
 * Who a move can target in doubles.
 * - `normal`: one adjacent Pokémon (choose a foe or ally slot).
 * - `all-adjacent-foes`: both opposing Pokémon (spread).
 * - `all-adjacent`: both foes and the ally (spread, e.g. Earthquake).
 * - `self`: the user's own slot.
 * - `ally`: the user's partner slot.
 */
export type MoveTarget =
  | "normal"
  | "all-adjacent-foes"
  | "all-adjacent"
  | "self"
  | "ally";

/** Combat stat stages (all stats except HP). */
export type StageStatKey = Exclude<StatKey, "hp">;

/** A move as shipped in fixtures. Power/accuracy/target are provisional. */
export interface MoveFixture {
  name: string;
  type: PokemonType;
  category: MoveCategory;
  /** null for status moves. */
  power: number | null;
  /** null means "does not check accuracy" (never-miss). 0–100 otherwise. */
  accuracy: number | null;
  /** Turn-order priority bracket. 0 is normal. */
  priority: number;
  target: MoveTarget;
  /** Attacking stat override (e.g. Body Press uses Defense). Default by category. */
  overrideOffensiveStat?: StageStatKey;
  /** Defending stat override (e.g. Psyshock hits physical Defense). Default by category. */
  overrideDefensiveStat?: Extract<StageStatKey, "def" | "spd">;
  /** Use the TARGET's offensive stat instead of the user's (Foul Play). */
  useTargetOffense?: boolean;
  /** Number of hits for multi-hit moves (default 1). */
  hits?: number;
}

/** True when a move hits more than one Pokémon (spread modifier applies). */
export function isSpreadTarget(target: MoveTarget): boolean {
  return target === "all-adjacent-foes" || target === "all-adjacent";
}

/** Normalized reference entry produced by a provider adapter. */
export interface Pokemon {
  id: string;
  slug: string;
  name: string;
  /** One or two types. */
  types: [PokemonType] | [PokemonType, PokemonType];
  baseStats: BaseStats;
  /** Legal ability names (regular + hidden). */
  abilities: string[];
  /** All legal move names the species can learn (the full movepool). */
  movepool: string[];
  /** Curated playable subset of moves with full battle data. */
  moves: MoveFixture[];
  provenance: Provenance;
}

/** Where a reference row came from and how fresh it is (spec requirement). */
export interface Provenance {
  provider: string;
  externalId: string;
  retrievedAt: string; // ISO timestamp
  dataVersion: string;
  normalizationVersion: string;
  updateStatus: "current" | "stale" | "superseded";
}

/** A nature: boosts one stat 10%, lowers another 10% (neutral = same stat). */
export interface Nature {
  name: string;
  boosted: StatKey;
  lowered: StatKey;
}

/** IV/EV spread for a single Pokémon set. */
export interface StatSpread {
  ivs: BaseStats;
  evs: BaseStats;
}

/** A fully-specified Pokémon set on a team. */
export interface PokemonSet {
  /** slug of the reference Pokémon. */
  species: string;
  level: number;
  ability: string | null;
  item: string | null;
  nature: string; // nature name
  moves: string[]; // move names
  spread: StatSpread;
}

/** An immutable team snapshot (persisted per version). */
export interface TeamSnapshot {
  members: PokemonSet[];
}
