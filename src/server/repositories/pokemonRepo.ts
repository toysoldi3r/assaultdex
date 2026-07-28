// Pokémon reference repository. Converts between DB rows (JSON-as-TEXT columns)
// and the domain Pokémon type. Import is idempotent via upsert on
// (provider, externalId).

import type { Pokemon } from "@/domain/types/pokemon";
import { fixturePokemonProvider } from "@/data/providers/fixturePokemonProvider";
import { prisma } from "../db";
import type { Prisma } from "@prisma/client";

interface PokemonRow {
  slug: string;
  name: string;
  types: string;
  baseStats: string;
  moves: string;
  provider: string;
  externalId: string;
  retrievedAt: Date;
  dataVersion: string;
  normalizationVersion: string;
  updateStatus: string;
}

function rowToDomain(row: PokemonRow): Pokemon {
  return {
    id: `${row.provider}:${row.externalId}`,
    slug: row.slug,
    name: row.name,
    types: JSON.parse(row.types) as Pokemon["types"],
    baseStats: JSON.parse(row.baseStats) as Pokemon["baseStats"],
    moves: JSON.parse(row.moves) as Pokemon["moves"],
    provenance: {
      provider: row.provider,
      externalId: row.externalId,
      retrievedAt: row.retrievedAt.toISOString(),
      dataVersion: row.dataVersion,
      normalizationVersion: row.normalizationVersion,
      updateStatus: row.updateStatus as Pokemon["provenance"]["updateStatus"],
    },
  };
}

function domainToWrite(p: Pokemon): Prisma.PokemonCreateInput {
  return {
    slug: p.slug,
    name: p.name,
    types: JSON.stringify(p.types),
    baseStats: JSON.stringify(p.baseStats),
    moves: JSON.stringify(p.moves),
    provider: p.provenance.provider,
    externalId: p.provenance.externalId,
    retrievedAt: new Date(p.provenance.retrievedAt),
    dataVersion: p.provenance.dataVersion,
    normalizationVersion: p.provenance.normalizationVersion,
    updateStatus: p.provenance.updateStatus,
  };
}

/** Import all Pokémon from the fixture provider. Idempotent (no duplicates). */
export async function importFixturePokemon(): Promise<{ imported: number }> {
  const page = await fixturePokemonProvider.fetchPage();
  let imported = 0;
  for (const raw of page.items) {
    const domain = fixturePokemonProvider.normalize(raw, page.dataVersion);
    const data = domainToWrite(domain);
    await prisma.pokemon.upsert({
      where: {
        provider_externalId: {
          provider: domain.provenance.provider,
          externalId: domain.provenance.externalId,
        },
      },
      create: data,
      update: {
        slug: data.slug,
        name: data.name,
        types: data.types,
        baseStats: data.baseStats,
        moves: data.moves,
        retrievedAt: data.retrievedAt,
        dataVersion: data.dataVersion,
        normalizationVersion: data.normalizationVersion,
        updateStatus: data.updateStatus,
      },
    });
    imported++;
  }
  return { imported };
}

export async function listPokemon(): Promise<Pokemon[]> {
  const rows = await prisma.pokemon.findMany({ orderBy: { name: "asc" } });
  return rows.map(rowToDomain);
}

export async function searchPokemon(query: string): Promise<Pokemon[]> {
  const q = query.trim();
  if (!q) return listPokemon();
  const rows = await prisma.pokemon.findMany({
    where: { name: { contains: q } },
    orderBy: { name: "asc" },
  });
  return rows.map(rowToDomain);
}

export async function getPokemonBySlug(slug: string): Promise<Pokemon | null> {
  const row = await prisma.pokemon.findUnique({ where: { slug } });
  return row ? rowToDomain(row) : null;
}
