// Cross-verify fixture base stats/types against PokéAPI and write a report.
//
//   pnpm tsx scripts/verifyFixtures.ts
//
// Requires outbound access to https://pokeapi.co. In environments where egress
// to PokéAPI is blocked by policy, this fails fast with a clear message; the
// committed docs/DATA_VERIFICATION.md records the last cross-check performed via
// public sources instead.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import fixtureDataset from "../src/data/fixtures/pokemon.json";
import { rawPokemonDatasetSchema } from "../src/data/schemas/pokemon";
import { normalizePokemon } from "../src/data/normalize";
import { pokeApiProvider } from "../src/data/providers/pokeApiProvider";
import { STAT_KEYS } from "../src/domain/types/pokemon";

interface Conflict {
  species: string;
  field: string;
  fixture: string;
  pokeapi: string;
}

async function main() {
  const dataset = rawPokemonDatasetSchema.parse(fixtureDataset);
  const conflicts: Conflict[] = [];
  const checked: string[] = [];

  for (const raw of dataset.pokemon) {
    const fixture = normalizePokemon(raw, {
      provider: "fixture",
      retrievedAt: new Date().toISOString(),
      dataVersion: dataset.data_version,
    });
    const ref = pokeApiProvider.normalize(
      pokeApiProvider.validate(await pokeApiProvider.fetchByName(fixture.slug)),
    );
    checked.push(fixture.name);

    const fixtureTypes = [...fixture.types].sort().join("/");
    const refTypes = [...ref.types].sort().join("/");
    if (fixtureTypes !== refTypes) {
      conflicts.push({ species: fixture.name, field: "types", fixture: fixtureTypes, pokeapi: refTypes });
    }
    for (const k of STAT_KEYS) {
      if (fixture.baseStats[k] !== ref.baseStats[k]) {
        conflicts.push({
          species: fixture.name,
          field: `baseStats.${k}`,
          fixture: String(fixture.baseStats[k]),
          pokeapi: String(ref.baseStats[k]),
        });
      }
    }

    // Abilities: normalize names (PokéAPI uses hyphenated-lowercase). Every
    // fixture ability must exist in PokéAPI's ability list for that species.
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const refAbilities = new Set(ref.abilities.map(norm));
    for (const ability of fixture.abilities) {
      if (!refAbilities.has(norm(ability))) {
        conflicts.push({
          species: fixture.name,
          field: "ability",
          fixture: ability,
          pokeapi: ref.abilities.join(", "),
        });
      }
    }
  }

  const lines = [
    "# Automated fixture verification (PokéAPI)",
    "",
    `Run: ${new Date().toISOString()}`,
    `Species checked: ${checked.length} (${checked.join(", ")})`,
    `Conflicts: ${conflicts.length}`,
    "",
  ];
  if (conflicts.length > 0) {
    lines.push("| Species | Field | Fixture | PokéAPI |", "| --- | --- | --- | --- |");
    for (const c of conflicts) {
      lines.push(`| ${c.species} | ${c.field} | ${c.fixture} | ${c.pokeapi} |`);
    }
  } else {
    lines.push("No conflicts: every fixture's base stats and types match PokéAPI.");
  }

  const out = resolve(dirname(fileURLToPath(import.meta.url)), "../docs/DATA_VERIFICATION_AUTORUN.md");
  writeFileSync(out, lines.join("\n") + "\n");
  console.log(`Checked ${checked.length} species, ${conflicts.length} conflict(s). Wrote ${out}`);
}

main().catch((err) => {
  console.error(
    "Verification could not run (PokéAPI unreachable or blocked by egress policy):",
    err instanceof Error ? err.message : err,
  );
  process.exitCode = 1;
});
