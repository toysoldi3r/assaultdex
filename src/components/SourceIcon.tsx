"use client";

// Site icon for the Sources page. Prefers a self-hosted favicon committed under
// public/sourceicons/<slug>.png (fetched out of band by scripts/refreshSourceIcons.ts
// - the app never requests an external image, so the CSP stays "no external
// origins"). If the file is missing it falls back to a coloured monogram tile,
// so the page looks complete before any icon has been fetched.

import { useState } from "react";

function initialsOf(name: string): string {
  if (name.startsWith("r/")) return "r/";
  const cleaned = name.replace(/^r\//, "").replace(/[^A-Za-z0-9 ]/g, " ").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

function hueOf(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export function SourceIcon({ slug, name }: { slug: string; name: string }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/sourceicons/${slug}.png`}
        alt=""
        aria-hidden
        width={36}
        height={36}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-9 w-9 shrink-0 rounded-md bg-white/5 object-contain p-1"
      />
    );
  }

  const hue = hueOf(name);
  return (
    <span
      aria-hidden
      className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-[11px] font-bold"
      style={{
        background: `hsl(${hue} 55% 22%)`,
        color: `hsl(${hue} 85% 72%)`,
        border: `1px solid hsl(${hue} 60% 40% / 0.5)`,
      }}
    >
      {initialsOf(name)}
    </span>
  );
}
