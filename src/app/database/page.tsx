import { DatabaseApp } from "@/components/database/DatabaseApp";
import { listDbItems, listDbAbilities, listDbMoves } from "@/data/dexDatabase";
import { listPokemon } from "@/server/repositories/pokemonRepo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Database",
  description: "One index for items, abilities, and moves — with the exact formulas the battle engine applies — plus a type chart, rulesets, and a glossary.",
};

export default async function DatabasePage() {
  const [items, abilities, moves, pokemon] = await Promise.all([
    Promise.resolve(listDbItems()),
    Promise.resolve(listDbAbilities()),
    Promise.resolve(listDbMoves()),
    listPokemon(),
  ]);
  // Abilities / moves that appear in the Champions roster, for the default filter.
  const championsAbilities = [...new Set(pokemon.flatMap((p) => p.abilities))];
  // Per-species learnable movepool (name + slug + moves), for the Moves tab's
  // "learnable by Pokémon" filter and the pokemon-icon column.
  const pokemonMovepools = pokemon.map((p) => ({
    name: p.name,
    slug: p.slug,
    moves: p.movepool.length ? p.movepool : p.moves.map((m) => m.name),
  }));
  const championsMoves = [...new Set(pokemonMovepools.flatMap((p) => p.moves))];
  // Popularity proxy: how many Champions species can learn each move.
  const moveUsage: Record<string, number> = {};
  for (const p of pokemonMovepools) for (const mv of p.moves) moveUsage[mv] = (moveUsage[mv] ?? 0) + 1;

  return (
    <DatabaseApp
      items={items}
      abilities={abilities}
      moves={moves}
      championsAbilities={championsAbilities}
      championsMoves={championsMoves}
      pokemonMovepools={pokemonMovepools}
      moveUsage={moveUsage}
    />
  );
}
