// Refresh the committed Pokémon artwork set under public/pokeart/. Runs OUT OF
// BAND (locally or in CI), never at request time, so the deployed app makes no
// external calls - it only serves the self-hosted WebP files this script commits.
//
// Source is the PokéAPI sprite set on GitHub (GitHub -> GitHub, like the usage
// and item-icon refreshes); no third-party CDN is contacted. The roster comes
// from the app's own fixture, and each species' PokéAPI sprite id is its national
// dex number (from @pkmn/dex) - except the regional forms, whose distinct variety
// ids are pinned in FORM_SPRITE_IDS below (verified against PokéAPI). Files are
// named by species slug so the client can address them without any id lookup.
//
// Upstream artwork is ~475px PNG (~130KB each). For the web we trim the
// transparent margin, bound the longest side to 384px, and re-encode as WebP,
// which cuts each set from ~31MB to ~5MB with no visible loss at the sizes the
// UI renders. That optimization needs Python 3 + Pillow (`pip install Pillow`) -
// the same "an image tool is required to (re)build the assets" model the
// upstream smogon/sprites repo uses (it needs ImageMagick). The step runs
// automatically here; the whole pipeline is one command:
//
//   pnpm refresh:pokemon-art                   # refresh every shipped style
//   POKEMON_ART_STYLES=artwork pnpm ...        # just one style
//
// Each style is written to public/pokeart/<style>/. The upstream sub-path for a
// style is mapped in STYLE_SOURCES below.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Dex } from "@pkmn/dex";

// Species slug, identical to the seed's normalization (src/data/normalize.ts)
// and scripts/genDexNumbers.ts, so art filenames match the DB `slug`.
const slugify = (id: string) => id.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

// Regional forms have their own PokéAPI variety id (not the base dex number).
// Keyed by @pkmn external_id. Verified via PokéAPI species -> varieties.
const FORM_SPRITE_IDS: Record<string, number> = {
  arcaninehisui: 10230, avalugghisui: 10243, decidueyehisui: 10244,
  goodrahisui: 10242, ninetalesalola: 10104, raichualola: 10100,
  samurotthisui: 10236, slowbrogalar: 10165, slowkinggalar: 10172,
  stunfiskgalar: 10180, taurospaldeaaqua: 10252, taurospaldeablaze: 10251,
  taurospaldeacombat: 10250, typhlosionhisui: 10233, zoroarkhisui: 10239,
};

const MAX_PX = 384;
const WEBP_QUALITY = 82;

// Shipped style -> its sub-path (relative to SPRITES_BASE) under the PokéAPI
// sprite set. The folder name on the left is what the app addresses (see
// src/lib/pokemonArt.ts); "sprites" is the front battle sprite at the root.
const STYLE_SOURCES: Record<string, string> = {
  artwork: "other/official-artwork/",
  sprites: "",
};
const SPRITES_BASE =
  process.env.POKEMON_ART_BASE_URL ||
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/";
const STYLES = (process.env.POKEMON_ART_STYLES || Object.keys(STYLE_SOURCES).join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ART_ROOT = join(process.cwd(), "public", "pokeart");
const ROSTER = join(process.cwd(), "src", "data", "fixtures", "pokemon.json");
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // \x89PNG

const gen = Dex.forGen(9);

function spriteId(externalId: string): number | null {
  if (FORM_SPRITE_IDS[externalId] != null) return FORM_SPRITE_IDS[externalId];
  const sp = gen.species.get(externalId);
  return sp.exists && sp.num > 0 ? sp.num : null;
}

async function fetchArt(styleSource: string, id: number): Promise<Buffer | null> {
  const res = await fetch(`${SPRITES_BASE}${styleSource}${id}.png`);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 4 || !buf.subarray(0, 4).equals(PNG_MAGIC)) return null;
  return buf;
}

// Trim transparent margins, bound to MAX_PX, re-encode as WebP. Reads *.png from
// `src`, writes *.webp to `dst`. Requires Python 3 + Pillow.
const OPTIMIZE_PY = `
import os, sys, glob
from PIL import Image
src, dst, mx, q = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
os.makedirs(dst, exist_ok=True)
for f in sorted(glob.glob(os.path.join(src, "*.png"))):
    im = Image.open(f).convert("RGBA")
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    if max(im.size) > mx:
        im.thumbnail((mx, mx), Image.LANCZOS)
    slug = os.path.splitext(os.path.basename(f))[0]
    im.save(os.path.join(dst, slug + ".webp"), "WEBP", quality=q, method=4)
`;

async function refreshStyle(style: string) {
  const styleSource = STYLE_SOURCES[style];
  if (styleSource == null) {
    throw new Error(`unknown style "${style}" (known: ${Object.keys(STYLE_SOURCES).join(", ")})`);
  }

  const roster = JSON.parse(readFileSync(ROSTER, "utf8")) as {
    pokemon: { external_id: string }[];
  };
  const srcDir = mkdtempSync(join(tmpdir(), `pokeart-${style}-`));

  let fetched = 0;
  const missing: string[] = [];
  for (const { external_id } of roster.pokemon) {
    const slug = slugify(external_id);
    const id = spriteId(external_id);
    const buf = id != null ? await fetchArt(styleSource, id) : null;
    if (buf) {
      writeFileSync(join(srcDir, `${slug}.png`), buf);
      fetched += 1;
    } else {
      missing.push(external_id);
    }
  }

  // Regenerate the style folder from scratch so removed species don't orphan.
  const outDir = join(ART_ROOT, style);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  execFileSync(
    "python3",
    ["-c", OPTIMIZE_PY, srcDir, outDir, String(MAX_PX), String(WEBP_QUALITY)],
    { stdio: "inherit" },
  );
  rmSync(srcDir, { recursive: true, force: true });

  const written = readdirSync(outDir).filter((f) => f.endsWith(".webp")).length;
  console.log(`pokemon art [${style}]: fetched ${fetched}, wrote ${written} webp, no art for ${missing.length}`);
  if (missing.length) console.log(`  no art: ${missing.sort().join(", ")}`);
}

async function main() {
  for (const style of STYLES) await refreshStyle(style);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
