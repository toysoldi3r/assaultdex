"use client";

// Global "which Pokémon sprite style" preference, shared by every sprite the app
// draws (PokeIcon, the ChoiceDex Sprite, PokemonArt). Kept as a tiny external
// store rather than React context so any client component can read it without a
// provider, and so the value is available synchronously at hydration from the
// <html data-sprite> attribute (set by the no-flash script in layout) - avoiding
// a pixel→artwork flash.

import { useSyncExternalStore } from "react";
import type { PokemonArtStyle } from "./pokemonArt";

/** "pixel" = the Showdown icon sheet; the rest are self-hosted art files. */
export type SpriteStyle = "pixel" | PokemonArtStyle;

export const SPRITE_STYLE_KEY = "assaultdex.spriteStyle";
export const DEFAULT_SPRITE_STYLE: SpriteStyle = "pixel";
const EVENT = "assaultdex:spritestyle";

const VALID: readonly SpriteStyle[] = ["pixel", "artwork", "home"];
function coerce(v: string | null | undefined): SpriteStyle {
  return VALID.includes(v as SpriteStyle) ? (v as SpriteStyle) : DEFAULT_SPRITE_STYLE;
}

/** Showdown id: lowercase, strip everything non-alphanumeric. Matches the art
 *  filenames (which are keyed by slugified external_id = the Showdown id), so
 *  any species name OR slug a call site passes resolves to the right file. */
export function toID(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function read(): SpriteStyle {
  if (typeof document === "undefined") return DEFAULT_SPRITE_STYLE;
  return coerce(document.documentElement.dataset.sprite);
}

export function setSpriteStyle(style: SpriteStyle) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.sprite = style;
    try {
      localStorage.setItem(SPRITE_STYLE_KEY, style);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT));
  }
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  // Reflect changes made in another tab.
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Current sprite style, re-rendering on change. SSR/first paint returns the
 *  default ("pixel"); the client snapshot reads the real value at hydration. */
export function useSpriteStyle(): SpriteStyle {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_SPRITE_STYLE);
}
