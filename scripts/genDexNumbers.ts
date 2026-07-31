// Generate src/data/fixtures/dexNumbers.json (slug -> national dex number) from
// @pkmn/dex, matching the fixture roster. Build-time only.
import { readFileSync, writeFileSync } from "node:fs";
import { Dex } from "@pkmn/dex";

const slugify = (id: string) => id.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
const data = JSON.parse(readFileSync("src/data/fixtures/pokemon.json", "utf8")) as {
  pokemon: { external_id: string }[];
};
const out: Record<string, number> = {};
for (const p of data.pokemon) {
  const sp = Dex.species.get(p.external_id);
  out[slugify(p.external_id)] = sp.exists ? sp.num : 99999;
}
writeFileSync("src/data/fixtures/dexNumbers.json", JSON.stringify(out) + "\n");
console.log(`wrote ${Object.keys(out).length} dex numbers`);
