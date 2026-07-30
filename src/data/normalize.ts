// Normalize raw provider Pokémon into the internal domain type, attaching
// provenance. Bumping NORMALIZATION_VERSION signals that stored rows should be
// re-normalized.

import type {
  MoveFixture,
  Pokemon,
  PokemonType,
  Provenance,
} from "@/domain/types/pokemon";
import type { RawMove, RawPokemon } from "./schemas/pokemon";

export const NORMALIZATION_VERSION = "1.0.0";

function slugify(externalId: string): string {
  return externalId.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function normalizeMove(raw: RawMove): MoveFixture {
  return {
    name: raw.name,
    type: raw.type,
    category: raw.category,
    power: raw.power,
    accuracy: raw.accuracy,
    priority: raw.priority,
    target: raw.target,
  };
}

export function normalizePokemon(
  raw: RawPokemon,
  meta: { provider: string; retrievedAt: string; dataVersion: string },
): Pokemon {
  const types = raw.types as PokemonType[];
  const provenance: Provenance = {
    provider: meta.provider,
    externalId: raw.external_id,
    retrievedAt: meta.retrievedAt,
    dataVersion: meta.dataVersion,
    normalizationVersion: NORMALIZATION_VERSION,
    updateStatus: "current",
  };

  return {
    id: `${meta.provider}:${raw.external_id}`,
    slug: slugify(raw.external_id),
    name: raw.name,
    types:
      types.length === 2
        ? [types[0]!, types[1]!]
        : [types[0]!],
    baseStats: {
      hp: raw.base_stats.hp,
      atk: raw.base_stats.attack,
      def: raw.base_stats.defense,
      spa: raw.base_stats.special_attack,
      spd: raw.base_stats.special_defense,
      spe: raw.base_stats.speed,
    },
    abilities: [...raw.abilities],
    moves: raw.moves.map(normalizeMove),
    provenance,
  };
}
