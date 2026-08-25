// Single source of truth for held-item icon assets. Both the client `ItemIcon`
// component and the out-of-band `scripts/refreshItemIcons.ts` fetch script go
// through this so the on-disk filename and the URL the browser requests can
// never drift apart.
//
// Icons are individual PNGs self-hosted under `public/itemicons/`, sourced from
// the PokéAPI sprite set (see the fetch script). No external origin is ever
// requested at runtime - the CSP stays "no external origins". Items with no
// matching sprite (e.g. the Champions-only Mega Stones, which don't exist in
// any real sprite set) simply have no file; `ItemIcon` renders nothing and the
// caller's item name stands on its own, exactly as before any sprite existed.

/** Map a Showdown/@pkmn item display name to its PokéAPI sprite slug. */
export function itemSpriteSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’".]/g, "") // King's Rock -> kings-rock
    .replace(/\s+/g, "-"); // Choice Band -> choice-band
}

/** Public path to the self-hosted icon for an item (may or may not exist). */
export function itemSpriteSrc(name: string): string {
  return `/itemicons/${itemSpriteSlug(name)}.png`;
}
