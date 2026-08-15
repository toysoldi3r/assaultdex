// Design tokens for the ChoiceDex redesign, copied verbatim from the design
// handoff's `logic.js`. These are the source of truth for the redesigned setup
// and battle screens; do not round or re-derive them.

export const ACC = "oklch(72% 0.1 190)";
export const RAISE = "oklch(24% 0.008 240)";
export const T2 = "oklch(72% 0.01 240)";
export const BG = "oklch(16% 0.008 240)";
export const POS = "oklch(72% 0.13 150)";
export const NEG = "oklch(68% 0.16 25)";
export const WARN = "oklch(80% 0.13 85)";

export const STATUS_COLOR: Record<string, string> = {
  burn: "#ea580c",
  paralysis: "#eab308",
  poison: "#a21caf",
  toxic: "#701a75",
  sleep: "#64748b",
  freeze: "#22d3ee",
};
export const STATUS_SHORT: Record<string, string> = {
  none: "OK", burn: "brn", paralysis: "par", poison: "psn", toxic: "tox", sleep: "slp", freeze: "frz",
};
export const STATUS_GLYPH: Record<string, string> = {
  burn: "🔥", paralysis: "ϟ", poison: "❋", toxic: "☠", sleep: "z", freeze: "❄",
};
export const STATUS_WASH: Record<string, string> = {
  burn: "radial-gradient(circle at 50% 78%, rgba(255,140,40,.6), rgba(255,80,0,.22) 55%, transparent 72%)",
  paralysis: "radial-gradient(circle at 50% 50%, rgba(250,220,60,.4), transparent 70%)",
  poison: "radial-gradient(circle at 35% 40%, rgba(200,80,220,.45), transparent 45%), radial-gradient(circle at 68% 62%, rgba(200,80,220,.4), transparent 42%)",
  toxic: "radial-gradient(circle at 42% 45%, rgba(150,30,170,.55), transparent 50%), radial-gradient(circle at 70% 66%, rgba(150,30,170,.45), transparent 45%)",
  sleep: "radial-gradient(circle at 50% 50%, rgba(70,90,150,.45), transparent 72%)",
  freeze: "radial-gradient(circle at 50% 50%, rgba(120,225,255,.5), rgba(60,180,230,.28) 60%, transparent 76%)",
};

export interface Stage {
  id: string;
  label: string;
  horizon: string;
  sky: string;
  glow: string;
  ground: string;
  grid: string;
}

export const STAGES: Stage[] = [
  { id: "meadow", label: "Meadow", horizon: "44%",
    sky: "linear-gradient(to bottom, #2f7fb5 0%, #64b6dd 44%, #8fd0e6 60%, #0f2a1c 60%)",
    glow: "radial-gradient(60% 100% at 50% 50%, rgba(255,244,214,.55), transparent 70%)",
    ground: "linear-gradient(to bottom, #3f9a5c 0%, #276b3d 40%, #12331f 100%)",
    grid: "linear-gradient(rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px)" },
  { id: "ocean", label: "Ocean", horizon: "42%",
    sky: "linear-gradient(to bottom, #1b5f86 0%, #4ba3cc 42%, #7fd0e8 56%, #06283a 56%)",
    glow: "radial-gradient(60% 100% at 50% 50%, rgba(210,245,255,.5), transparent 70%)",
    ground: "linear-gradient(to bottom, #1c7fa5 0%, #0f5677 45%, #06283a 100%)",
    grid: "linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px)" },
  { id: "volcano", label: "Volcano", horizon: "46%",
    sky: "linear-gradient(to bottom, #2b0d0d 0%, #6b1f14 42%, #b3462a 54%, #150c0a 54%)",
    glow: "radial-gradient(60% 100% at 50% 50%, rgba(255,140,60,.55), transparent 70%)",
    ground: "linear-gradient(to bottom, #4a1f16 0%, #2a120e 45%, #120807 100%)",
    grid: "linear-gradient(rgba(255,150,80,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,150,80,.18) 1px, transparent 1px)" },
  { id: "cave", label: "Cave", horizon: "48%",
    sky: "linear-gradient(to bottom, #10151d 0%, #202b3a 44%, #34435a 56%, #0a0e14 56%)",
    glow: "radial-gradient(60% 100% at 50% 50%, rgba(150,180,220,.28), transparent 70%)",
    ground: "linear-gradient(to bottom, #33405a 0%, #1c2432 45%, #0a0e14 100%)",
    grid: "linear-gradient(rgba(190,210,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(190,210,255,.12) 1px, transparent 1px)" },
  { id: "night", label: "Night sky", horizon: "46%",
    sky: "radial-gradient(1px 1px at 18% 16%, #fff, transparent), radial-gradient(1px 1px at 62% 10%, #fff, transparent), radial-gradient(1px 1px at 40% 26%, #cbd5e1, transparent), radial-gradient(1px 1px at 82% 22%, #e2e8f0, transparent), linear-gradient(to bottom, #0b1030 0%, #17224e 42%, #2b3a6b 54%, #060911 54%)",
    glow: "radial-gradient(60% 100% at 50% 50%, rgba(140,170,255,.35), transparent 70%)",
    ground: "linear-gradient(to bottom, #1d2748 0%, #121a30 45%, #060911 100%)",
    grid: "linear-gradient(rgba(160,190,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(160,190,255,.16) 1px, transparent 1px)" },
  { id: "stadium", label: "Stadium", horizon: "43%",
    sky: "linear-gradient(to bottom, #241542 0%, #3d2168 40%, #6b3b9e 54%, #0d1a12 54%)",
    glow: "radial-gradient(60% 100% at 50% 50%, rgba(232,180,255,.4), transparent 70%)",
    ground: "linear-gradient(to bottom, #1f6b3f 0%, #14492c 45%, #071a10 100%)",
    grid: "linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)" },
];

export const ROOM_FX: Record<string, string> = {
  trickRoom: "repeating-linear-gradient(0deg, rgba(196,120,255,.16) 0 2px, transparent 2px 16px), radial-gradient(120% 80% at 50% 50%, transparent 40%, rgba(120,40,190,.4) 100%)",
  gravity: "linear-gradient(to bottom, rgba(140,110,60,.34), transparent 45%), repeating-linear-gradient(90deg, rgba(255,220,150,.12) 0 1px, transparent 1px 22px)",
  magicRoom: "radial-gradient(90% 70% at 50% 100%, rgba(60,220,220,.34), transparent 70%)",
  wonderRoom: "radial-gradient(90% 70% at 50% 0%, rgba(255,190,80,.32), transparent 70%)",
};
export const WEATHER_FX: Record<string, string> = {
  none: "none",
  sun: "radial-gradient(45% 32% at 68% 8%, rgba(255,246,200,.95), rgba(255,208,110,.55) 55%, transparent 78%), linear-gradient(to bottom, rgba(255,196,90,.34), rgba(255,170,60,.1) 55%, transparent), repeating-conic-gradient(from 0deg at 68% 8%, rgba(255,235,170,.16) 0deg 5deg, transparent 5deg 16deg)",
  rain: "repeating-linear-gradient(104deg, rgba(190,225,255,.28) 0 1px, transparent 1px 7px), linear-gradient(to bottom, rgba(20,40,70,.35), rgba(20,40,70,.1))",
  sand: "repeating-linear-gradient(96deg, rgba(214,180,120,.2) 0 2px, transparent 2px 9px), linear-gradient(to bottom, rgba(180,140,80,.28), rgba(120,90,50,.18))",
  snow: "radial-gradient(3px 3px at 12% 22%, #fff, transparent), radial-gradient(3px 3px at 34% 54%, #fff, transparent), radial-gradient(2px 2px at 55% 16%, #fff, transparent), radial-gradient(3px 3px at 72% 40%, #fff, transparent), radial-gradient(2px 2px at 88% 70%, #fff, transparent), radial-gradient(3px 3px at 24% 82%, #fff, transparent), radial-gradient(2px 2px at 62% 88%, #fff, transparent), radial-gradient(2px 2px at 46% 34%, rgba(255,255,255,.9), transparent), linear-gradient(to bottom, rgba(206,235,255,.5), rgba(180,215,245,.22) 60%, rgba(255,255,255,.14))",
};
export const TERRAIN_FX: Record<string, string> = {
  none: "none",
  electric: "linear-gradient(to top, rgba(247,195,37,.5) 0%, rgba(247,195,37,.16) 34%, transparent 58%), repeating-linear-gradient(90deg, rgba(255,240,150,.3) 0 2px, transparent 2px 26px)",
  grassy: "linear-gradient(to top, rgba(67,190,60,.55) 0%, rgba(67,169,60,.2) 34%, transparent 58%), repeating-linear-gradient(72deg, rgba(180,255,150,.18) 0 3px, transparent 3px 15px)",
  misty: "linear-gradient(to top, rgba(255,170,255,.5) 0%, rgba(239,112,239,.2) 36%, transparent 60%), radial-gradient(70% 30% at 50% 88%, rgba(255,255,255,.4), transparent 70%)",
  psychic: "linear-gradient(to top, rgba(239,65,121,.5) 0%, rgba(190,60,200,.2) 36%, transparent 60%), repeating-conic-gradient(from 20deg at 50% 96%, rgba(255,140,220,.22) 0deg 8deg, transparent 8deg 24deg)",
};

/** HP-bar colour rule from the token spec. */
export function hpColor(p: number): string {
  return p <= 0 ? "oklch(45% 0.01 240)" : p <= 20 ? NEG : p <= 50 ? WARN : POS;
}

/** Type chip descriptor: full name, 3-letter short, and hex, in one pass. */
export function typesFor(arr: readonly string[]): { name: string; short: string; hex: string }[] {
  return arr.map((t) => ({ name: t, short: t.slice(0, 3), hex: TYPE_HEX[t] ?? "#777" }));
}

// The type palette matches the app's existing map exactly.
export const TYPE_HEX: Record<string, string> = {
  normal: "#9FA19F", fire: "#E8503A", water: "#2980EF", electric: "#F7C325", grass: "#43A93C",
  ice: "#3DCEF3", fighting: "#FF8000", poison: "#9141CB", ground: "#A9702F", flying: "#81B9EF",
  psychic: "#EF4179", bug: "#9CAA22", rock: "#B7AF7E", ghost: "#7B4E8C", dragon: "#5060E1",
  dark: "#6B5453", steel: "#60A1B8", fairy: "#EF70EF",
};
