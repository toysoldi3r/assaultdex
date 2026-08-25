// Reader for the committed Pokédex flavor fixture (genus, height, foreign-name
// list, and per-game Pokédex entries). Populated OUT OF BAND by
// scripts/refreshPokedex.ts from PokéAPI - never fetched at request time, so the
// running app makes no external call (same posture as the usage snapshot).
//
// The fixture is keyed by @pkmn species id (the page slug). When empty or when a
// species is absent, every getter returns null/empty and the page simply omits
// the corresponding card - nothing breaks before a refresh has run.

import raw from "./fixtures/pokedex.json";

export interface PokedexEntryText {
  /** Game/version the entry is from (e.g. "scarlet"). */
  version: string;
  text: string;
}

export interface ForeignName {
  /** PokéAPI language code (e.g. "ja", "fr", "de", "ko", "zh-Hant"). */
  lang: string;
  name: string;
}

export interface PokedexFlavor {
  /** Species classification ("Seed Pokémon", "Deceiver Pokémon", ...). */
  genus?: string;
  /** Height in metres (PokéAPI). */
  heightM?: number;
  names?: ForeignName[];
  entries?: PokedexEntryText[];
}

const map = raw as Record<string, PokedexFlavor>;

/** Flavor extras for a species by @pkmn slug, or null when not yet fetched. */
export function getPokedexFlavor(slug: string): PokedexFlavor | null {
  const v = map[slug];
  return v && Object.keys(v).length > 0 ? v : null;
}

/** Human labels for the PokéAPI language codes we surface. */
export const LANGUAGE_LABELS: Record<string, string> = {
  ja: "Japanese",
  "ja-Hrkt": "Japanese (kana)",
  roomaji: "Rōmaji",
  ko: "Korean",
  "zh-Hant": "Chinese (Trad.)",
  "zh-Hans": "Chinese (Simp.)",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  en: "English",
};

/** Prettify a PokéAPI version id ("legends-arceus" -> "Legends Arceus"). */
export function versionLabel(version: string): string {
  return version
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
