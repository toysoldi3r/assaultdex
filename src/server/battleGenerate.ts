// Generate a sample battle by simulating a game and recording each turn as a
// provisional replay. Clearly labelled as generated (not a real Champions
// replay). Used so the dashboard/analysis have data before a real replay format
// exists.

import { natureByName } from "@/data/fixtures/natures";
import { buildCombatant, DEFAULT_EVS, DEFAULT_IVS } from "@/domain/battle/build";
import { greedyPolicy, practicePolicy, type Difficulty } from "@/domain/sim/policy";
import { activeCount, applyTurn, makeRng } from "@/domain/sim/transition";
import type { BattleState, Combatant } from "@/domain/types/battle";
import { DEFAULT_FIELD, NO_SIDE_CONDITIONS } from "@/domain/types/battle";
import type { Replay, ReplayTurn } from "@/domain/replay/types";
import type { ProfileName } from "@/domain/choicedex/scoring";
import { getPokemonBySlug } from "./repositories/pokemonRepo";

async function build(species: string): Promise<Combatant | null> {
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
    tier: "entered",
  });
}

export interface GenerateInput {
  userTeam: [string, string];
  opponentTeam: [string, string];
  difficulty: Difficulty;
  profile?: ProfileName;
  seed?: number;
  maxTurns?: number;
}

export async function generateSampleReplay(
  input: GenerateInput,
): Promise<Replay | null> {
  const [u1, u2, o1, o2] = await Promise.all([
    build(input.userTeam[0]),
    build(input.userTeam[1]),
    build(input.opponentTeam[0]),
    build(input.opponentTeam[1]),
  ]);
  if (!u1 || !u2 || !o1 || !o2) return null;

  let state: BattleState = {
    turn: 1,
    field: { ...DEFAULT_FIELD },
    user: { active: [u1, u2], bench: [], conditions: { ...NO_SIDE_CONDITIONS } },
    opponent: { active: [o1, o2], bench: [], conditions: { ...NO_SIDE_CONDITIONS } },
  };

  const rng = makeRng(input.seed ?? 0xc0ffee);
  const userPolicy = greedyPolicy(input.profile ?? "aggressive");
  const oppPolicy = practicePolicy(input.difficulty, "balanced");
  const maxTurns = input.maxTurns ?? 15;

  const turns: ReplayTurn[] = [];
  for (let t = 0; t < maxTurns; t++) {
    if (activeCount(state, "user") === 0 || activeCount(state, "opponent") === 0) {
      break;
    }
    const userAction = userPolicy(state, "user", rng);
    const opponentAction = oppPolicy(state, "opponent", rng);
    turns.push({ state: structuredClone(state), userAction, opponentAction });
    state = applyTurn(state, userAction, opponentAction, rng).state;
  }
  // Record the terminal state as a final turn (no actions) so the result and
  // the last observed KO are captured.
  turns.push({ state: structuredClone(state), userAction: [], opponentAction: [] });

  return {
    format: "assaultdex-provisional-v1",
    players: ["You", "Practice AI"],
    userTeam: [input.userTeam[0], input.userTeam[1]],
    opponentTeam: [input.opponentTeam[0], input.opponentTeam[1]],
    turns,
  };
}
