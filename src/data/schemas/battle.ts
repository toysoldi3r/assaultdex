// Zod schemas for battle state, actions, and the PROVISIONAL replay format.
//
// No confirmed Pokémon Champions replay format exists. This is an internal,
// clearly-versioned provisional format used for fixtures and testing, exactly
// as the spec directs ("use an interface and test fixtures rather than claiming
// full replay support"). It is replaced when a real format is confirmed.

import { z } from "zod";
import {
  moveCategorySchema,
  moveTargetSchema,
  pokemonTypeSchema,
} from "./pokemon";

const baseStatsSchema = z.object({
  hp: z.number().int(),
  atk: z.number().int(),
  def: z.number().int(),
  spa: z.number().int(),
  spd: z.number().int(),
  spe: z.number().int(),
});

const stageStatsSchema = z.object({
  atk: z.number().int().min(-6).max(6),
  def: z.number().int().min(-6).max(6),
  spa: z.number().int().min(-6).max(6),
  spd: z.number().int().min(-6).max(6),
  spe: z.number().int().min(-6).max(6),
});

const statusSchema = z.enum([
  "none",
  "burn",
  "paralysis",
  "poison",
  "toxic",
  "sleep",
  "freeze",
]);

const tierSchema = z.enum([
  "confirmed",
  "entered",
  "calculated",
  "inferred",
  "unknown",
]);

const moveSchema = z.object({
  name: z.string().min(1),
  type: pokemonTypeSchema,
  category: moveCategorySchema,
  power: z.number().int().nullable(),
  accuracy: z.number().nullable(),
  priority: z.number().int(),
  target: moveTargetSchema,
});

const combatantSchema = z.object({
  species: z.string().min(1),
  name: z.string().min(1),
  types: z.array(pokemonTypeSchema).min(1).max(2),
  level: z.number().int().min(1).max(100),
  stats: baseStatsSchema,
  currentHp: z.number().int().min(0),
  status: statusSchema,
  stages: stageStatsSchema,
  ability: z.string().nullable(),
  item: z.string().nullable(),
  moves: z.array(moveSchema),
  fainted: z.boolean(),
  tier: tierSchema,
});

const sideConditionsSchema = z.object({
  tailwind: z.boolean(),
  reflect: z.boolean(),
  lightScreen: z.boolean(),
  auroraVeil: z.boolean(),
});

const fieldSchema = z.object({
  weather: z.enum(["none", "sun", "rain", "sand", "snow"]),
  terrain: z.enum(["none", "electric", "grassy", "misty", "psychic"]),
  trickRoom: z.boolean(),
});

const sideStateSchema = z.object({
  active: z.tuple([combatantSchema.nullable(), combatantSchema.nullable()]),
  bench: z.array(combatantSchema),
  conditions: sideConditionsSchema,
});

export const battleStateSchema = z.object({
  turn: z.number().int(),
  field: fieldSchema,
  user: sideStateSchema,
  opponent: sideStateSchema,
});

const slotSchema = z.union([z.literal(0), z.literal(1)]);
const sideSchema = z.enum(["user", "opponent"]);

const actionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("move"),
    side: sideSchema,
    slot: slotSchema,
    moveName: z.string().min(1),
    targetSide: sideSchema,
    targetSlot: z.union([z.literal(0), z.literal(1), z.null()]),
    spread: z.boolean(),
  }),
  z.object({
    kind: z.literal("switch"),
    side: sideSchema,
    slot: slotSchema,
    switchTo: z.string().min(1),
  }),
]);

const actionComboSchema = z.array(actionSchema);

const replayTurnSchema = z.object({
  state: battleStateSchema,
  userAction: actionComboSchema,
  opponentAction: actionComboSchema,
});

export const REPLAY_FORMAT = "assaultdex-provisional-v1" as const;

export const replaySchema = z.object({
  format: z.literal(REPLAY_FORMAT),
  players: z.tuple([z.string().min(1), z.string().min(1)]),
  userTeam: z.array(z.string().min(1)),
  opponentTeam: z.array(z.string().min(1)),
  turns: z.array(replayTurnSchema).min(1),
});

export type ReplayInput = z.infer<typeof replaySchema>;
export type ReplayTurnInput = z.infer<typeof replayTurnSchema>;
