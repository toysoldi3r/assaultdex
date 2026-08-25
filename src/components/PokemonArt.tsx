"use client";

// Large Pokémon portrait for the Pokédex species header. Follows the sprite
// style chosen in the display menu:
//  - "pixel"            → the scaled-up pixel menu icon (the app's original look)
//  - "artwork" / "sprites" → a self-hosted WebP art file (public/pokeart/<style>/)
//
// No external origin is ever requested, so the CSP stays "no external origins".
// If a species has no art file for the chosen style (e.g. a Mega forme), the
// <img> errors and we fall back to the pixel icon, so nothing renders blank.

import { useState } from "react";
import { pokemonArtSrc } from "@/lib/pokemonArt";
import { toID, useSpriteStyle } from "@/lib/spriteStyle";
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
  const spriteStyle = useSpriteStyle();
  const [failed, setFailed] = useState(false);

  if (spriteStyle === "pixel" || failed) {
    // A scaled-up pixel icon centred in the box (the original header look).
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
      src={pokemonArtSrc(spriteStyle, toID(slug))}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        imageRendering: spriteStyle === "sprites" ? "pixelated" : "auto",
      }}
    />
  );
}
