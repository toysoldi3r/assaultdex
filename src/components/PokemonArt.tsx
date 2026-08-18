"use client";

// Large Pokémon artwork (official artwork, self-hosted under public/pokeart/;
// see src/lib/pokemonArt.ts and scripts/refreshPokemonArt.ts). No external
// origin is ever requested, so the CSP stays "no external origins".
//
// If a species has no art file (a slug added since the last art refresh), the
// <img> errors and we fall back to the pixel menu icon scaled up - exactly what
// the app showed before any artwork existed - so nothing ever renders blank.

import { useState } from "react";
import { pokemonArtSrc } from "@/lib/pokemonArt";
import { PokeIcon } from "@/components/PokeIcon";

export function PokemonArt({
  slug,
  name,
  size = 112,
  className,
}: {
  /** Species slug (the art filename key). */
  slug: string;
  /** Display name, used for the icon fallback and the accessible label. */
  name: string;
  /** Rendered box size in px (square). */
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    // Match the previous look: a scaled-up pixel icon centred in the box.
    return (
      <span
        className={className}
        style={{ display: "grid", placeItems: "center", width: size, height: size, overflow: "hidden" }}
      >
        <PokeIcon species={name} className="scale-[2.6]" title="" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={pokemonArtSrc(slug)}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
