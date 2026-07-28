// Shared test helpers (not a test file). Builds combatants/states for the
// mechanics and ChoiceDex tests.

import { buildCombatant, DEFAULT_EVS, DEFAULT_IVS } from "../battle/build";
import type { BattleState, Combatant } from "../types/battle";
import { DEFAULT_FIELD } from "../types/battle";
import type {
  BaseStats,
  MoveFixture,
  Nature,
  PokemonType,
} from "../types/pokemon";

export const NEUTRAL_NATURE: Nature = {
  name: "Serious",
  boosted: "spe",
  lowered: "spe",
};

export function stats(overrides: Partial<BaseStats> = {}): BaseStats {
  return { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100, ...overrides };
}

export function combatant(opts: {
  name: string;
  types: [PokemonType] | [PokemonType, PokemonType];
  base: BaseStats;
  moves?: MoveFixture[];
  hpFraction?: number;
}): Combatant {
  return buildCombatant({
    species: opts.name.toLowerCase(),
    name: opts.name,
    types: opts.types,
    baseStats: opts.base,
    moves: opts.moves ?? [],
    level: 50,
    ivs: DEFAULT_IVS,
    evs: DEFAULT_EVS,
    nature: NEUTRAL_NATURE,
    hpFraction: opts.hpFraction ?? 1,
  });
}

export function move(overrides: Partial<MoveFixture> = {}): MoveFixture {
  return {
    name: "Test Move",
    type: "normal",
    category: "physical",
    power: 80,
    accuracy: 100,
    priority: 0,
    ...overrides,
  };
}

export function battleState(
  user: [Combatant | null, Combatant | null],
  opponent: [Combatant | null, Combatant | null],
): BattleState {
  return {
    turn: 1,
    field: { ...DEFAULT_FIELD },
    user: { active: user, bench: [] },
    opponent: { active: opponent, bench: [] },
  };
}
