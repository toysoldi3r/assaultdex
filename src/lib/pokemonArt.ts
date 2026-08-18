// Single source of truth for the large Pokémon artwork assets. Both the client
// `PokemonArt` component and the out-of-band `scripts/refreshPokemonArt.ts`
// fetch script key art files by the species slug, so on-disk filename and the
// URL the browser requests can never drift apart.
//
// Art is self-hosted under `public/pokeart/<style>/` (from the PokéAPI sprite
// set - see the fetch script), downscaled and encoded as WebP for the web, so
// no external origin is requested at runtime and the CSP stays "no external
// origins". Two styles ship: "artwork" (official 2D artwork) and "home" (3D
// HOME renders). A species with no art file falls back to the pixel menu icon,
// so nothing ever renders blank.

/** Pokémon art styles that ship as self-hosted files (the pixel icon sheet is
 *  handled separately by PokeIcon, not here). */
export type PokemonArtStyle = "artwork" | "home";

/** Public path to the self-hosted artwork for a species slug in a given style. */
export function pokemonArtSrc(style: PokemonArtStyle, slug: string): string {
  return `/pokeart/${style}/${slug}.webp`;
}
