"use client";

// Pokémon sprite, in whatever style the user picked in the display menu:
//  - "pixel"   → the locally-hosted Showdown icon spritesheet (the default).
//                @pkmn/img computes the sheet offset; we rewrite its CDN URL to
//                our self-hosted copy (public/pokemonicons-sheet.png) so no
//                external image is ever requested - CSP stays "no external
//                origins".
//  - "artwork" / "home" → a self-hosted WebP art file (public/pokeart/<style>/),
//                rendered into the *same box* the pixel icon would occupy so
//                every call site keeps its exact layout and only the picture
//                changes. If the art file is missing (e.g. a Mega battle forme),
//                it falls back to the pixel icon.

import { useState, type CSSProperties } from "react";
import { Icons } from "@pkmn/img";
import { pokemonArtSrc } from "@/lib/pokemonArt";
import { toID, useSpriteStyle } from "@/lib/spriteStyle";

const CDN = "https://play.pokemonshowdown.com/sprites/pokemonicons-sheet.png";
const LOCAL = "/pokemonicons-sheet.png";

function cssToObject(css: string): CSSProperties {
  const obj: Record<string, string> = {};
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i === -1) continue;
    const key = decl
      .slice(0, i)
      .trim()
      .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    obj[key] = decl.slice(i + 1).trim();
  }
  return obj as CSSProperties;
}

export function PokeIcon({
  species,
  className,
  title,
}: {
  species: string;
  className?: string;
  /** Tooltip override. Defaults to the species name; pass "" to disable it so
   *  a parent element's own tooltip shows over the icon instead. */
  title?: string;
}) {
  const spriteStyle = useSpriteStyle();
  const [artFailed, setArtFailed] = useState(false);
  const pixelStyle = cssToObject(Icons.getPokemon(species).style.split(CDN).join(LOCAL));
  // An empty title means "no own tooltip" (omit the attribute entirely) so a
  // parent element's tooltip shows over the icon; a real string overrides it.
  const tip = title === "" ? undefined : (title ?? species);

  if (spriteStyle !== "pixel" && !artFailed) {
    // Render the art into the exact footprint of the pixel icon so any scale/
    // layout the call site applies via className behaves identically.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={pokemonArtSrc(spriteStyle, toID(species))}
        alt={species}
        aria-label={species}
        title={tip}
        loading="lazy"
        decoding="async"
        onError={() => setArtFailed(true)}
        className={className}
        style={{
          width: pixelStyle.width,
          height: pixelStyle.height,
          objectFit: "contain",
          display: "inline-block",
          verticalAlign: "middle",
        }}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={species}
      title={tip}
      className={className}
      style={pixelStyle}
    />
  );
}
