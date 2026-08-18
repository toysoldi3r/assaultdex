// Refresh the committed held-item icon set under public/itemicons/. Runs OUT OF
// BAND (locally or in CI), never at request time, so the deployed app makes no
// external calls - it only serves the self-hosted PNGs this script commits.
//
// Source is the PokéAPI sprite set on GitHub (GitHub -> GitHub, like the usage
// refresh); no third-party CDN is contacted. Item names come from the app's own
// item data (listDbItems), so coverage tracks the dex automatically. Items with
// no matching sprite - notably the Champions-only Mega Stones, which don't exist
// in any real sprite set - are skipped; ItemIcon renders the name alone for those.
//
//   pnpm refresh:item-icons
//
// Override the source with ITEM_ICON_BASE_URL if the upstream path moves.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listDbItems } from "../src/data/dexDatabase";
import { itemSpriteSlug } from "../src/lib/itemSprite";

const BASE_URL =
  process.env.ITEM_ICON_BASE_URL ||
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/";

const OUT_DIR = join(process.cwd(), "public", "itemicons");
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // \x89PNG

async function fetchIcon(slug: string): Promise<Buffer | null> {
  const res = await fetch(`${BASE_URL}${slug}.png`);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  // Guard against a soft-404 body (e.g. "404: Not Found") slipping through.
  if (buf.length < 4 || !buf.subarray(0, 4).equals(PNG_MAGIC)) return null;
  return buf;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // De-dupe slugs (a few display names can collapse to the same slug).
  const slugs = new Map<string, string>(); // slug -> representative name
  for (const item of listDbItems()) {
    const slug = itemSpriteSlug(item.name);
    if (!slugs.has(slug)) slugs.set(slug, item.name);
  }

  let saved = 0;
  const missing: string[] = [];
  for (const [slug, name] of slugs) {
    const buf = await fetchIcon(slug);
    if (buf) {
      writeFileSync(join(OUT_DIR, `${slug}.png`), buf);
      saved += 1;
    } else {
      missing.push(name);
    }
  }

  console.log(`item icons: saved ${saved}, no sprite for ${missing.length}`);
  if (missing.length) console.log(`  no sprite: ${missing.sort().join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
