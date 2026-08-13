// Reference list of competitive Pokémon doubles rulesets ("Regulations"). This
// is a curated summary for orientation, not a rules authority - exact banlists
// live with the official source (see the Sources tab). The only format
// AssaultDex actually models is the active Champions Regulation M-B; the others
// are listed for context. Restricted Legendaries are the strongest box-art /
// cover Legendaries, capped per regulation.

export interface Ruleset {
  /** Short code shown as a chip, e.g. "Reg M-B". */
  code: string;
  /** Full name. */
  name: string;
  /** Game the regulation belongs to. */
  game: string;
  /** Active in the app's snapshot, or a past/other regulation. */
  status: "active" | "reference";
  /** Restricted-Legendary allowance (the defining axis of a regulation). */
  restricted: string;
  /** One-line orientation summary. */
  summary: string;
}

// Shared doubles ground rules that every VGC-style regulation keeps.
export const COMMON_RULES = [
  "Doubles (2v2 on the field) from a team of 6; bring 4 at team preview.",
  "All Pokémon set to Level 50 (levels scaled).",
  "Species Clause (no duplicate species) and Item Clause (no duplicate held items).",
  "No Mythicals unless a regulation explicitly allows specific ones.",
  "Events are played best-of-three (Bo3).",
];

export const RULESETS: Ruleset[] = [
  {
    code: "Reg M-B",
    name: "Champions VGC 2026 — Regulation M-B",
    game: "Pokémon Champions",
    status: "active",
    restricted: "See official rules",
    summary:
      "The format AssaultDex models. Best-of-three Champions doubles; the 235-species pool and metagame snapshot on this site are for this regulation.",
  },
  {
    code: "Reg I",
    name: "Scarlet & Violet — Regulation I",
    game: "Pokémon Scarlet & Violet",
    status: "reference",
    restricted: "Up to 2 restricted",
    summary:
      "The final SV regulation: two restricted Legendaries allowed on a team, the most open of the SV series.",
  },
  {
    code: "Reg H",
    name: "Scarlet & Violet — Regulation H",
    game: "Pokémon Scarlet & Violet",
    status: "reference",
    restricted: "No restricted, no Paradox",
    summary:
      "A back-to-basics regulation: no restricted Legendaries and no Paradox Pokémon, so ordinary Pokémon define the meta.",
  },
  {
    code: "Reg G",
    name: "Scarlet & Violet — Regulation G",
    game: "Pokémon Scarlet & Violet",
    status: "reference",
    restricted: "Up to 1 restricted",
    summary:
      "One restricted Legendary allowed per team — the classic single-restricted format.",
  },
  {
    code: "Reg A–F",
    name: "Scarlet & Violet — Regulations A through F",
    game: "Pokémon Scarlet & Violet",
    status: "reference",
    restricted: "No restricted",
    summary:
      "The earlier SV rotations that expanded the legal roster as DLC released, before restricted Legendaries entered the format.",
  },
];
