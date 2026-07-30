// Zod schemas validating raw provider/fixture Pokémon data. All external input
// is validated before it reaches the domain (spec: "Validate all inputs and
// external responses").

import { z } from "zod";
import { POKEMON_TYPES } from "@/domain/types/pokemon";

export const pokemonTypeSchema = z.enum(POKEMON_TYPES);

export const moveCategorySchema = z.enum(["physical", "special", "status"]);

export const moveTargetSchema = z.enum([
  "normal",
  "all-adjacent-foes",
  "all-adjacent",
  "self",
  "ally",
]);

export const rawMoveSchema = z.object({
  name: z.string().min(1),
  type: pokemonTypeSchema,
  category: moveCategorySchema,
  power: z.number().int().min(0).max(300).nullable(),
  accuracy: z.number().min(0).max(100).nullable(),
  priority: z.number().int().min(-7).max(7),
  target: moveTargetSchema.default("normal"),
});

export const rawBaseStatsSchema = z.object({
  hp: z.number().int().min(1).max(255),
  attack: z.number().int().min(1).max(255),
  defense: z.number().int().min(1).max(255),
  special_attack: z.number().int().min(1).max(255),
  special_defense: z.number().int().min(1).max(255),
  speed: z.number().int().min(1).max(255),
});

export const rawPokemonSchema = z.object({
  external_id: z.string().min(1),
  name: z.string().min(1),
  types: z.array(pokemonTypeSchema).min(1).max(2),
  base_stats: rawBaseStatsSchema,
  abilities: z.array(z.string().min(1)).min(1),
  moves: z.array(rawMoveSchema).min(1),
});

export const rawPokemonDatasetSchema = z.object({
  data_version: z.string().min(1),
  note: z.string().optional(),
  pokemon: z.array(rawPokemonSchema).min(1),
});

export type RawMove = z.infer<typeof rawMoveSchema>;
export type RawBaseStats = z.infer<typeof rawBaseStatsSchema>;
export type RawPokemon = z.infer<typeof rawPokemonSchema>;
export type RawPokemonDataset = z.infer<typeof rawPokemonDatasetSchema>;
