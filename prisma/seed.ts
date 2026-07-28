// Idempotent seed: imports Pokémon from the fixture provider adapter. Running
// it repeatedly creates no duplicates (upsert on provider + externalId).

import { importFixturePokemon } from "../src/server/repositories/pokemonRepo";
import { prisma } from "../src/server/db";

async function main() {
  const { imported } = await importFixturePokemon();
  const total = await prisma.pokemon.count();
  console.log(`Seed complete: upserted ${imported} Pokémon (total rows: ${total}).`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
