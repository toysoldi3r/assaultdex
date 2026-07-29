// Battle-state domain types. Doubles only (spec: Pokémon Champions doubles).

import type { BaseStats, MoveFixture, PokemonType } from "./pokemon";

/**
 * How trustworthy a piece of battle information is. The UI must visibly
 * distinguish these (spec: "confirmed, entered, calculated, inferred,
 * unknown").
 */
export type InformationTier =
  | "confirmed"
  | "entered"
  | "calculated"
  | "inferred"
  | "unknown";

export type StatusCondition =
  | "none"
  | "burn"
  | "paralysis"
  | "poison"
  | "toxic"
  | "sleep"
  | "freeze";

/** Combat stat stages, -6..+6. hp is excluded (not a stage stat). */
export type StageStats = Record<Exclude<keyof BaseStats, "hp">, number>;

/** A concrete combatant on the field (or on the bench). */
export interface Combatant {
  /** Reference species slug. */
  species: string;
  name: string;
  types: [PokemonType] | [PokemonType, PokemonType];
  level: number;
  /** Fully computed non-HP stats and max HP. */
  stats: BaseStats;
  currentHp: number;
  status: StatusCondition;
  stages: StageStats;
  ability: string | null;
  item: string | null;
  /** Known/entered moves. Opponent moves may be partially known. */
  moves: MoveFixture[];
  fainted: boolean;
  /** Trust level of this combatant's set as a whole. */
  tier: InformationTier;
}

export type Weather = "none" | "sun" | "rain" | "sand" | "snow";
export type Terrain = "none" | "electric" | "grassy" | "misty" | "psychic";

/** Whole-field conditions (affect both sides). */
export interface FieldState {
  weather: Weather;
  terrain: Terrain;
  trickRoom: boolean;
}

/** Conditions that apply to a single side of the field. */
export interface SideConditions {
  tailwind: boolean;
  reflect: boolean;
  lightScreen: boolean;
  auroraVeil: boolean;
}

export const NO_SIDE_CONDITIONS: SideConditions = {
  tailwind: false,
  reflect: false,
  lightScreen: false,
  auroraVeil: false,
};

/** One side of the field in doubles: two active slots + bench + conditions. */
export interface SideState {
  active: [Combatant | null, Combatant | null];
  bench: Combatant[];
  conditions: SideConditions;
}

/** The complete, editable battle state for a single position. */
export interface BattleState {
  turn: number;
  field: FieldState;
  user: SideState;
  opponent: SideState;
}

export const NEUTRAL_STAGES: StageStats = {
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
};

export const DEFAULT_FIELD: FieldState = {
  weather: "none",
  terrain: "none",
  trickRoom: false,
};
