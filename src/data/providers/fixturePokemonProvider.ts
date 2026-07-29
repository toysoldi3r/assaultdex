// Fixture Pokémon provider adapter (Phase 1). Reads documented local fixtures,
// validates with Zod, and normalizes to the domain Pokémon type. No live
// network provider is claimed. A single "page" holds the whole fixture set.

import type { Pokemon } from "@/domain/types/pokemon";
import fixtureDataset from "../fixtures/pokemon.json";
import { normalizePokemon } from "../normalize";
import {
  rawPokemonDatasetSchema,
  rawPokemonSchema,
  type RawPokemon,
} from "../schemas/pokemon";
import type { ProviderAdapter, RawPage } from "./types";

export const FIXTURE_PROVIDER = "fixture";

export class FixturePokemonProvider
  implements ProviderAdapter<RawPokemon, Pokemon>
{
  readonly provider = FIXTURE_PROVIDER;

  async fetchPage(): Promise<RawPage<RawPokemon>> {
    // Validate the whole dataset up front (fail fast on malformed fixtures).
    const dataset = rawPokemonDatasetSchema.parse(fixtureDataset);
    return {
      items: dataset.pokemon,
      nextCursor: null,
      dataVersion: dataset.data_version,
    };
  }

  validate(raw: unknown): RawPokemon {
    return rawPokemonSchema.parse(raw);
  }

  normalize(raw: RawPokemon, dataVersion: string): Pokemon {
    return normalizePokemon(raw, {
      provider: this.provider,
      retrievedAt: new Date().toISOString(),
      dataVersion,
    });
  }
}

export const fixturePokemonProvider = new FixturePokemonProvider();
