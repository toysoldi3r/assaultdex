"use client";

// Held-item icon, self-hosted under public/itemicons/ (see src/lib/itemSprite.ts
// and scripts/refreshItemIcons.ts). Each item is an individual PNG; no external
// origin is ever requested, so the CSP stays "no external origins".
//
// Not every item has a sprite - the Champions-only Mega Stones don't exist in
// any real sprite set. Callers always render the item name too, so a missing
// sprite must leave no gap: the <img> hides itself on error and the name stands
// alone, exactly as it did before any icon existed.

import { useState } from "react";
import { itemSpriteSrc } from "@/lib/itemSprite";

export function ItemIcon({
  item,
  className,
  size = 26,
}: {
  item: string;
  className?: string;
  /** Rendered box size in px (icons are square). */
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (!item || item === "None" || failed) return null;
  // A plain <img> (not next/image): these are 30x30 committed PNGs served from
  // our own origin, so the optimizer adds no value and would only need a loader.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={itemSpriteSrc(item)}
      alt=""
      aria-label={item}
      title={item}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        imageRendering: "pixelated",
        objectFit: "contain",
      }}
    />
  );
}
