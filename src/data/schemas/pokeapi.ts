// Zod schema for the subset of the PokéAPI `/pokemon/{name}` response we use for
// reference cross-verification (base stats + types). PokéAPI is a public,
// permissively-licensed source; it does NOT model the Pokémon Champions pool or
// Champions-specific mechanics, so it is used only to verify base stats/types of
// species we already ship as fixtures.

import { z } from "zod";
import { pokemonTypeSchema } from "./pokemon";

const pokeApiStatSchema = z.object({
  base_stat: z.number().int().min(1).max(255),
  stat: z.object({ name: z.string().min(1) }),
});

const pokeApiTypeSchema = z.object({
  slot: z.number().int().min(1).max(2),
  type: z.object({ name: pokemonTypeSchema }),
});

const pokeApiAbilitySchema = z.object({
  ability: z.object({ name: z.string().min(1) }),
  is_hidden: z.boolean(),
});

export const pokeApiPokemonSchema = z.object({
  name: z.string().min(1),
  stats: z.array(pokeApiStatSchema).min(6),
  types: z.array(pokeApiTypeSchema).min(1).max(2),
  abilities: z.array(pokeApiAbilitySchema).min(1),
});

export type PokeApiPokemon = z.infer<typeof pokeApiPokemonSchema>;

/** PokéAPI stat name → internal StatKey. */
export const POKEAPI_STAT_MAP = {
  hp: "hp",
  attack: "atk",
  defense: "def",
  "special-attack": "spa",
  "special-defense": "spd",
  speed: "spe",
} as const;
