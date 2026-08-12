// Pokémon menu icon from the locally-hosted Showdown icon spritesheet. @pkmn/img
// computes the sprite-sheet offset; we rewrite its CDN URL to our self-hosted
// copy (public/pokemonicons-sheet.png) so no external image is ever requested -
// CSP stays "no external origins" and nothing leaks to a third-party CDN.

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
  const style = cssToObject(Icons.getPokemon(species).style.split(CDN).join(LOCAL));
  // An empty title means "no own tooltip" (omit the attribute entirely) so a
  // parent element's tooltip shows over the icon; a real string overrides it.
  const tip = title === "" ? undefined : (title ?? species);
  return (
    <span
      role="img"
      aria-label={species}
      title={tip}
      className={className}
      style={style}
    />
  );
}
