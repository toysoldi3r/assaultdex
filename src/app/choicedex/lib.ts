import { natureByName } from "@/data/fixtures/natures";
import {
  buildCombatant,
  DEFAULT_EVS,
  DEFAULT_IVS,
} from "@/domain/battle/build";
import type {
  BattleState,
  Combatant,
  FieldState,
  InformationTier,
  SideConditions,
} from "@/domain/types/battle";
import { DEFAULT_FIELD, NO_SIDE_CONDITIONS } from "@/domain/types/battle";
import { getPokemonBySlug } from "@/server/repositories/pokemonRepo";

/** Build a level-50 combatant from a reference species. */
export async function buildSideCombatant(
  species: string,
  hpFraction: number,
  tier: InformationTier,
): Promise<Combatant | null> {
  const ref = await getPokemonBySlug(species);
  if (!ref) return null;
  return buildCombatant({
    species: ref.slug,
    name: ref.name,
    types: ref.types,
    baseStats: ref.baseStats,
    moves: ref.moves,
    level: 50,
    ivs: DEFAULT_IVS,
    evs: DEFAULT_EVS,
    nature: natureByName("Serious"),
    hpFraction,
    tier,
  });
}

export interface BuildStateInput {
  user: [string, string];
  opponent: [string, string];
  userHp: [number, number];
  opponentHp: [number, number];
  field?: Partial<FieldState>;
  userConditions?: Partial<SideConditions>;
  opponentConditions?: Partial<SideConditions>;
}

/** Assemble a full two-active-per-side battle state. */
export async function buildBattleState(
  input: BuildStateInput,
): Promise<BattleState | null> {
  const [u1, u2, o1, o2] = await Promise.all([
    buildSideCombatant(input.user[0], input.userHp[0], "entered"),
    buildSideCombatant(input.user[1], input.userHp[1], "entered"),
    // Opponent sets are "entered" here; real inference is Phase 6.
    buildSideCombatant(input.opponent[0], input.opponentHp[0], "entered"),
    buildSideCombatant(input.opponent[1], input.opponentHp[1], "entered"),
  ]);
  if (!u1 || !u2 || !o1 || !o2) return null;
  return {
    turn: 1,
    field: { ...DEFAULT_FIELD, ...input.field },
    user: {
      active: [u1, u2],
      bench: [],
      conditions: { ...NO_SIDE_CONDITIONS, ...input.userConditions },
    },
    opponent: {
      active: [o1, o2],
      bench: [],
      conditions: { ...NO_SIDE_CONDITIONS, ...input.opponentConditions },
    },
  };
}
