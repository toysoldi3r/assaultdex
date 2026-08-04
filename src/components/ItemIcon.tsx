"use client";

// Held-item icon from the locally-hosted Showdown item spritesheet, mirroring
// PokeIcon. The sheet (public/itemicons-sheet.png) is large and not always
// present, so the component probes it once: until the sheet loads it renders
// nothing (callers always show the item name too), and it lights up automatically
// the moment the asset is added. No external origin is ever requested — CSP stays
// "no external origins".

import { useEffect, useState, type CSSProperties } from "react";
import { Icons } from "@pkmn/img";

const CDN = "https://play.pokemonshowdown.com/sprites/itemicons-sheet.png";
const LOCAL = "/itemicons-sheet.png";

// Module-level singleton probe so the sheet is checked once for the whole app.
let sheetStatus: "unknown" | "ok" | "missing" = "unknown";
const listeners = new Set<(ok: boolean) => void>();
function probe() {
  if (typeof window === "undefined" || sheetStatus !== "unknown") return;
  const img = new Image();
  img.onload = () => {
    sheetStatus = "ok";
    listeners.forEach((l) => l(true));
  };
  img.onerror = () => {
    sheetStatus = "missing";
    listeners.forEach((l) => l(false));
  };
  img.src = LOCAL;
}

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

export function ItemIcon({ item, className }: { item: string; className?: string }) {
  const [ok, setOk] = useState(sheetStatus === "ok");
  useEffect(() => {
    if (sheetStatus === "ok") return setOk(true);
    if (sheetStatus === "missing") return;
    const l = (v: boolean) => setOk(v);
    listeners.add(l);
    probe();
    return () => {
      listeners.delete(l);
    };
  }, []);

  if (!ok || !item || item === "None") return null;
  const style = cssToObject(Icons.getItem(item).style.split(CDN).join(LOCAL));
  return (
    <span
      role="img"
      aria-label={item}
      title={item}
      className={className}
      style={style}
    />
  );
}
