import { DatabaseApp } from "@/components/database/DatabaseApp";
import { listDbItems, listDbAbilities, listDbMoves } from "@/data/dexDatabase";
import { buildDexEntries } from "@/data/dexIndex";
import { toPokemonRefs, type PokemonRef } from "@/lib/choicedexBuild";
import { listPokemon } from "@/server/repositories/pokemonRepo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Database",
  description: "One index for items, abilities, moves — with the exact formulas the battle engine applies — plus a calculator, type chart, rulesets, and a glossary.",
};

export default async function DatabasePage() {
  const [items, abilities, moves, pokemon] = await Promise.all([
    Promise.resolve(listDbItems()),
    Promise.resolve(listDbAbilities()),
    Promise.resolve(listDbMoves()),
    listPokemon(),
  ]);
  const refs: PokemonRef[] = toPokemonRefs(pokemon);
  const entries = buildDexEntries({ items, abilities, moves, pokemon });

  return <DatabaseApp entries={entries} pokemon={refs} />;
}
