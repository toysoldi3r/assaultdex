// Pure helper to construct a battle Combatant from reference data + a spread.
// Takes primitives (base stats, nature object) so the domain stays free of data
// adapters. Callers resolve species/nature lookups before calling.

import { computeStats } from "../mechanics/stats";
import type { Combatant, InformationTier, StatusCondition } from "../types/battle";
import { NEUTRAL_STAGES } from "../types/battle";
import type {
  BaseStats,
  MoveFixture,
  Nature,
  PokemonType,
} from "../types/pokemon";

export interface BuildCombatantInput {
  species: string;
  name: string;
  types: [PokemonType] | [PokemonType, PokemonType];
  baseStats: BaseStats;
  moves: MoveFixture[];
  level: number;
  ivs: BaseStats;
  evs: BaseStats;
  nature: Nature;
  /** 0..1 fraction of max HP remaining. Defaults to full. */
  hpFraction?: number;
  status?: StatusCondition;
  item?: string | null;
  ability?: string | null;
  tier?: InformationTier;
}

export function buildCombatant(input: BuildCombatantInput): Combatant {
  const stats = computeStats(
    input.baseStats,
    input.ivs,
    input.evs,
    input.level,
    input.nature,
  );
  const hpFraction = Math.max(0, Math.min(1, input.hpFraction ?? 1));
  const currentHp = Math.max(0, Math.round(stats.hp * hpFraction));
  return {
    species: input.species,
    name: input.name,
    types: input.types,
    level: input.level,
    stats,
    currentHp,
    status: input.status ?? "none",
    stages: { ...NEUTRAL_STAGES },
    ability: input.ability ?? null,
    item: input.item ?? null,
    moves: input.moves,
    fainted: currentHp <= 0,
    tier: input.tier ?? "entered",
  };
}

/** A standard level-50 max-IV, zero-EV spread for quick battle setup. */
export const DEFAULT_IVS: BaseStats = {
  hp: 31,
  atk: 31,
  def: 31,
  spa: 31,
  spd: 31,
  spe: 31,
};

export const DEFAULT_EVS: BaseStats = {
  hp: 0,
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
};
