// Sprite helpers for the ChoiceDex redesign. The design addresses the icon
// sheet in two modes (a fixed 40x30 cell and a scalable window). We keep the
// correct Showdown-sheet mapping by going through @pkmn/img (as PokeIcon does)
// and then apply the design's sizing / scale / mirror / filter on top.

import type { CSSProperties } from "react";
import { Icons } from "@pkmn/img";

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
 * A species icon sized to a box and centred, with optional pixelated scale,
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
  const transform = `scale(${flip ? -scale : scale}, ${scale})`;
  return (
    <span
      title={title}
      aria-label={species}
      role="img"
      style={{
        width: typeof w === "number" ? `${w}px` : w,
        height: typeof h === "number" ? `${h}px` : h,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
        filter,
      }}
    >
      <span className="px" style={{ ...iconStyle(species), transform, transformOrigin: "center", flexShrink: 0 }} />
    </span>
  );
}
