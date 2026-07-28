// Zod schemas for team persistence. Team versions are stored as validated JSON
// snapshots; these schemas guard both write and read.

import { z } from "zod";
import { STAT_KEYS } from "@/domain/types/pokemon";

const statBlock = z.object(
  Object.fromEntries(
    STAT_KEYS.map((k) => [k, z.number().int().min(0).max(255)]),
  ) as Record<(typeof STAT_KEYS)[number], z.ZodNumber>,
);

export const pokemonSetSchema = z.object({
  species: z.string().min(1),
  level: z.number().int().min(1).max(100),
  ability: z.string().min(1).nullable(),
  item: z.string().min(1).nullable(),
  nature: z.string().min(1),
  moves: z.array(z.string().min(1)).max(4),
  spread: z.object({
    ivs: statBlock,
    evs: statBlock,
  }),
});

export const teamSnapshotSchema = z.object({
  members: z.array(pokemonSetSchema).min(1).max(6),
});

export type PokemonSetInput = z.infer<typeof pokemonSetSchema>;
export type TeamSnapshotInput = z.infer<typeof teamSnapshotSchema>;

/** Payload accepted by the create-team action. */
export const createTeamSchema = z.object({
  name: z.string().min(1).max(80),
  collectionId: z.string().min(1).nullable().optional(),
  snapshot: teamSnapshotSchema,
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
