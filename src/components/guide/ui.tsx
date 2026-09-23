"use client";

// Small building blocks shared by the Guide landing page and lesson pages.
// Colours come from the theme tokens (globals.css), so both themes work.

import { useState, type CSSProperties, type ReactNode } from "react";
import { PokeIcon } from "@/components/PokeIcon";
import { pokemonArtSrc } from "@/lib/pokemonArt";
import { toID, useSpriteStyle } from "@/lib/spriteStyle";

export function ProgressBar({ pct, height = 6 }: { pct: number; height?: number }) {
  return (
    <span className="block flex-1 overflow-hidden rounded bg-raise" style={{ height }}>
      <span
        className="block h-full rounded"
        style={{ width: `${pct}%`, background: "var(--g-gold)", transition: "width .25s ease" }}
      />
    </span>
  );
}

/** Rounded panel used for every interactive block. */
export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`rounded-xl border border-line bg-panel p-[18px] ${className}`} style={style}>
      {children}
    </div>
  );
}

/** Small grey heading at the top of a card ("Try it: …"). */
export function CardLabel({ children, className = "mb-3" }: { children: ReactNode; className?: string }) {
  return <p className={`text-xs font-semibold ${className}`} style={{ color: "var(--g-dim)" }}>{children}</p>;
}

/** Lesson body copy: a stack of paragraphs. */
export function Prose({ children, className = "mt-5", size = "lg" }: { children: ReactNode; className?: string; size?: "lg" | "md" }) {
  return (
    <div
      className={`flex flex-col gap-3.5 ${size === "lg" ? "text-[15px] leading-[1.65]" : "text-sm leading-[1.6]"} ${className}`}
      style={{ color: size === "lg" ? "var(--g-body)" : "var(--g-muted)" }}
    >
      {children}
    </div>
  );
}

/** Pill button that shows a selected state in blue (default) or gold. */
export function Chip({
  on, onClick, children, tone = "blue", className = "", ariaPressed = true,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: "blue" | "gold";
  className?: string;
  ariaPressed?: boolean;
}) {
  const c = tone === "gold" ? "var(--g-gold)" : "var(--g-blue)";
  const bg = tone === "gold" ? "var(--g-gold-bg)" : "var(--g-blue-bg)";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed ? on : undefined}
      className={`cursor-pointer rounded-[20px] border px-3.5 py-2 text-[13px] font-semibold ${className}`}
      style={{
        borderColor: on ? c : "var(--line)",
        background: on ? bg : "transparent",
        color: on ? c : "var(--g-muted)",
        transition: "background .2s ease, border-color .2s ease, color .2s ease",
      }}
    >
      {children}
    </button>
  );
}

/**
 * A Pokémon picture at an exact square size. Follows the sprite style chosen in
 * the display menu (pixel icon by default, or self-hosted art); a missing art
 * file falls back to the pixel icon, scaled to fill the box.
 */
export function GuideMon({ species, size = 40, className = "", style }: { species: string; size?: number; className?: string; style?: CSSProperties }) {
  const spriteStyle = useSpriteStyle();
  const [failed, setFailed] = useState(false);
  if (spriteStyle === "pixel" || failed) {
    return (
      <span
        className={className}
        style={{ display: "grid", placeItems: "center", width: size, height: size, overflow: "hidden", ...style }}
      >
        {/* The pixel icon is a 40×30 sheet cell; scale it to the box width. */}
        <span style={{ display: "inline-flex", transform: `scale(${size / 40})` }}>
          <PokeIcon species={species} title="" />
        </span>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={pokemonArtSrc(spriteStyle, toID(species))}
      alt={species}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", imageRendering: spriteStyle === "sprites" ? "pixelated" : "auto", ...style }}
    />
  );
}
