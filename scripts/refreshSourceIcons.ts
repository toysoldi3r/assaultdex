// Refresh the committed Sources-page favicon set under public/sourceicons/. Runs
// OUT OF BAND (locally or in CI), never at request time, so the deployed app
// makes no external call - it only serves the self-hosted PNGs this script
// commits. Sources with no fetchable icon fall back to a monogram tile in the UI.
//
//   pnpm refresh:source-icons
//
// Each site's favicon is fetched (a few common paths tried), normalized to a
// 64x64 PNG with sharp, and written as public/sourceicons/<slug>.png, where the
// slug is the domain's first label (matching slugOf on the Sources page).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // \x89PNG

// Keep in sync with the Sources page's URL list.
const URLS = [
  "https://play.pokemonshowdown.com/",
  "https://pokebase.app/pokemon-champions/teams",
  "https://www.pokemon-zone.com/champions/",
  "https://www.pikalytics.com/",
  "https://limitlessvgc.com/",
  "https://metavgc.com/",
  "https://showdowntier.com/",
  "https://munchstats.com/",
  "https://labmaus.net/",
  "https://www.vgcguide.com/",
  "https://www.smogon.com/",
  "https://pokemondb.net/",
  "https://www.serebii.net/",
  "https://bulbapedia.bulbagarden.net/",
  "https://www.reddit.com/r/VGC/",
];

const OUT_DIR = join(process.cwd(), "public", "sourceicons");
// PNG favicons only (kept as-is), so no image-processing dependency is needed;
// .ico / .svg are skipped and the UI shows a monogram for those.
const CANDIDATES = [
  "apple-touch-icon.png",
  "apple-touch-icon-precomposed.png",
  "favicon-96x96.png",
  "favicon-32x32.png",
  "favicon.png",
];

function slugOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "").split(".")[0]!.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

/** Fetch the first PNG favicon candidate for an origin, or null. */
async function fetchIcon(origin: string): Promise<Buffer | null> {
  for (const path of CANDIDATES) {
    try {
      const res = await fetch(`${origin}/${path}`);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      // Guard against soft-404 HTML bodies slipping through.
      if (buf.length < 4 || !buf.subarray(0, 4).equals(PNG_MAGIC)) continue;
      return buf;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const seen = new Set<string>();
  let saved = 0;
  const missing: string[] = [];
  for (const url of URLS) {
    const slug = slugOf(url);
    if (seen.has(slug)) continue;
    seen.add(slug);
    const origin = new URL(url).origin;
    const png = await fetchIcon(origin);
    if (png) {
      writeFileSync(join(OUT_DIR, `${slug}.png`), png);
      saved += 1;
    } else {
      missing.push(slug);
    }
  }
  console.log(`source icons: saved ${saved}, no icon for ${missing.length}`);
  if (missing.length) console.log(`  no icon: ${missing.sort().join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
