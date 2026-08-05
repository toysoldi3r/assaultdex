// PokéAPI reference provider adapter. Fetches a species' base stats and types
// from the public PokéAPI and normalizes them to an internal reference shape,
// handling timeout, retries, and validation (the ProviderAdapter cross-cutting
// concerns).
//
// Scope: PokéAPI is used ONLY for reference base stats/types cross-verification.
// It does not know the Pokémon Champions pool or Champions mechanics — pool
// membership and provisional move/mechanic data are handled separately.

import type {
  BaseStats,
  PokemonType,
  Provenance,
  StatKey,
} from "@/domain/types/pokemon";
import {
  POKEAPI_STAT_MAP,
  pokeApiPokemonSchema,
  type PokeApiPokemon,
} from "../schemas/pokeapi";
import { NORMALIZATION_VERSION } from "../normalize";
import { fetchProviderJson } from "./fetch";

export const POKEAPI_PROVIDER = "pokeapi";
const BASE_URL = "https://pokeapi.co/api/v2";

/** A verified reference subset (no moves — those stay provisional). */
export interface PokemonReference {
  slug: string;
  name: string;
  types: [PokemonType] | [PokemonType, PokemonType];
  baseStats: BaseStats;
  /** Ability names as PokéAPI reports them (hyphenated, e.g. "clear-body"). */
  abilities: string[];
  provenance: Provenance;
}

export interface FetchConfig {
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
}

export class PokeApiProvider {
  readonly provider = POKEAPI_PROVIDER;

  async fetchByName(name: string, config: FetchConfig = {}): Promise<unknown> {
    const slug = name.trim().toLowerCase();
    return fetchProviderJson(this.provider, `${BASE_URL}/pokemon/${encodeURIComponent(slug)}`, config);
  }

  validate(raw: unknown): PokeApiPokemon {
    return pokeApiPokemonSchema.parse(raw);
  }

  normalize(raw: PokeApiPokemon, retrievedAt = new Date().toISOString()): PokemonReference {
    const baseStats = {} as BaseStats;
    for (const s of raw.stats) {
      const key = POKEAPI_STAT_MAP[s.stat.name as keyof typeof POKEAPI_STAT_MAP];
      if (key) baseStats[key as StatKey] = s.base_stat;
    }

    const ordered = [...raw.types].sort((a, b) => a.slot - b.slot);
    const types = ordered.map((t) => t.type.name) as PokemonType[];

    return {
      slug: raw.name,
      name: raw.name,
      types: types.length === 2 ? [types[0]!, types[1]!] : [types[0]!],
      baseStats,
      abilities: raw.abilities.map((a) => a.ability.name),
      provenance: {
        provider: this.provider,
        externalId: raw.name,
        retrievedAt,
        dataVersion: "pokeapi-v2",
        normalizationVersion: NORMALIZATION_VERSION,
        updateStatus: "current",
      },
    };
  }
}

export const pokeApiProvider = new PokeApiProvider();
