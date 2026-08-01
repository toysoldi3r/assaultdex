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
  /**
   * Badly-poisoned ramp counter (Toxic). n/16 damage on turn n. Undefined is
   * treated as 1 on the first tick while status is "toxic".
   */
  toxicCounter?: number;
  /**
   * Perish Song countdown in turns remaining. null/undefined = not under Perish
   * Song; when it counts down to 0 at end of turn the Pokémon faints.
   */
  perish?: number | null;
}

export type Weather = "none" | "sun" | "rain" | "sand" | "snow";
export type Terrain = "none" | "electric" | "grassy" | "misty" | "psychic";

/**
 * Whole-field conditions (affect both sides). The `*Turns` fields are optional
 * countdowns: when present and > 0 they decrement each end of turn and the
 * condition clears at 0. Undefined means "no countdown" (persists) — this keeps
 * existing single-turn callers unchanged.
 */
export interface FieldState {
  weather: Weather;
  terrain: Terrain;
  trickRoom: boolean;
  weatherTurns?: number;
  terrainTurns?: number;
  trickRoomTurns?: number;
  /** Gravity: grounds every Pokémon (incl. Flying/Levitate) and boosts accuracy. */
  gravity?: boolean;
  gravityTurns?: number;
}

/**
 * Conditions that apply to a single side of the field, including entry hazards.
 * Hazards affect a Pokémon that switches in on this side.
 */
export interface SideConditions {
  tailwind: boolean;
  reflect: boolean;
  lightScreen: boolean;
  auroraVeil: boolean;
  tailwindTurns?: number;
  reflectTurns?: number;
  lightScreenTurns?: number;
  auroraVeilTurns?: number;
  /** Stealth Rock: entry damage scaled by Rock type-effectiveness. */
  stealthRock?: boolean;
  /** Spikes layers 0–3 (entry damage to grounded Pokémon). */
  spikes?: number;
  /** Toxic Spikes layers 0–2 (poison/toxic to grounded, non-immune Pokémon). */
  toxicSpikes?: number;
  /** Sticky Web: −1 Speed to a grounded Pokémon on entry. */
  stickyWeb?: boolean;
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
