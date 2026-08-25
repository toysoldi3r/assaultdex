"use client";

// Sprite helpers for the ChoiceDex redesign. Honors the display-menu sprite
// style: in "pixel" mode it addresses the Showdown icon sheet (via @pkmn/img,
// like PokeIcon) with the design's sizing / scale / mirror / filter; in
// "artwork" / "sprites" mode it draws the self-hosted WebP art into the same box,
// keeping the mirror and filter, and falls back to the pixel icon if the art
// file is missing (e.g. a Mega battle forme).

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

/** The raw 40x30 sprite style for a species, pointing at the local sheet. */
function iconStyle(species: string): CSSProperties {
  return cssToObject(Icons.getPokemon(species).style.split(CDN).join(LOCAL));
}

/**
 * A species sprite sized to a box and centred, with optional pixelated scale,
 * horizontal mirror and CSS filter. Used everywhere the design draws a sprite.
 */
export function Sprite({
  species,
  w,
  h,
  scale = 1,
  flip = false,
  filter,
  title,
}: {
  species: string;
  /** Box width. Number → px. */
  w: number | string;
  /** Box height. Number → px. */
  h: number | string;
  scale?: number;
  flip?: boolean;
  filter?: string;
  title?: string;
}) {
  const spriteStyle = useSpriteStyle();
  const [artFailed, setArtFailed] = useState(false);
  const box: CSSProperties = {
    width: typeof w === "number" ? `${w}px` : w,
    height: typeof h === "number" ? `${h}px` : h,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
    filter,
  };

  if (spriteStyle !== "pixel" && !artFailed) {
    return (
      <span title={title} aria-label={species} role="img" style={box}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pokemonArtSrc(spriteStyle, toID(species))}
          alt={species}
          loading="lazy"
          decoding="async"
          onError={() => setArtFailed(true)}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            transform: flip ? "scaleX(-1)" : undefined,
            imageRendering: spriteStyle === "sprites" ? "pixelated" : "auto",
          }}
        />
      </span>
    );
  }

  const transform = `scale(${flip ? -scale : scale}, ${scale})`;
  return (
    <span title={title} aria-label={species} role="img" style={box}>
      <span className="px" style={{ ...iconStyle(species), transform, transformOrigin: "center", flexShrink: 0 }} />
    </span>
  );
}
