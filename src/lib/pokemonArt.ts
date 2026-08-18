// Single source of truth for the large Pokémon artwork assets. Both the client
// `PokemonArt` component and the out-of-band `scripts/refreshPokemonArt.ts`
// fetch script key art files by the species slug, so on-disk filename and the
// URL the browser requests can never drift apart.
//
// Art is self-hosted under `public/pokeart/` (official artwork from the PokéAPI
// sprite set - see the fetch script), downscaled and encoded as WebP for the
// web, so no external origin is requested at runtime and the CSP stays "no
// external origins". A species with no art file (a slug added since the last
// refresh) has `PokemonArt` fall back to the pixel menu icon, so nothing ever
// renders blank.

/** Public path to the self-hosted artwork for a species slug (may not exist). */
export function pokemonArtSrc(slug: string): string {
  return `/pokeart/${slug}.webp`;
}
