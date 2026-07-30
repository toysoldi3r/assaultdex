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
  const move: MoveFixture = {
    name: raw.name,
    type: raw.type,
    category: raw.category,
    power: raw.power,
    accuracy: raw.accuracy,
    priority: raw.priority,
    target: raw.target,
  };
  if (raw.overrideOffensiveStat) move.overrideOffensiveStat = raw.overrideOffensiveStat;
  if (raw.overrideDefensiveStat) move.overrideDefensiveStat = raw.overrideDefensiveStat;
  if (raw.useTargetOffense) move.useTargetOffense = true;
  if (raw.hits && raw.hits > 1) move.hits = raw.hits;
  if (raw.flags && raw.flags.length > 0) move.flags = [...raw.flags];
  if (raw.secondary) move.secondary = { ...raw.secondary };
  if (raw.selfBoosts) move.selfBoosts = { ...raw.selfBoosts };
  return move;
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
    movepool: [...raw.movepool],
    moves: raw.moves.map(normalizeMove),
    provenance,
  };
}
