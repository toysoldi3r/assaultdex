// Pokémon Showdown team import/export format (the de-facto standard for sharing
// teams). Pure text <-> structured conversion. Species are carried by display
// name; the caller resolves names to reference slugs.

import { NATURES } from "@/data/fixtures/natures";
import { STAT_KEYS, type PokemonSet, type StatKey } from "@/domain/types/pokemon";

const STAT_LABEL: Record<StatKey, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};
const LABEL_STAT: Record<string, StatKey> = {
  hp: "hp",
  atk: "atk",
  def: "def",
  spa: "spa",
  spd: "spd",
  spe: "spe",
};

const zeroStats = (): Record<StatKey, number> =>
  Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Record<StatKey, number>;
const maxIvs = (): Record<StatKey, number> =>
  Object.fromEntries(STAT_KEYS.map((k) => [k, 31])) as Record<StatKey, number>;

function statLine(label: string, block: Record<StatKey, number>, skip: number): string | null {
  const parts = STAT_KEYS.filter((k) => block[k] !== skip).map(
    (k) => `${block[k]} ${STAT_LABEL[k]}`,
  );
  return parts.length > 0 ? `${label}: ${parts.join(" / ")}` : null;
}

/** Format one set in Showdown syntax. `displayName` is the species name. */
export function formatShowdownSet(set: PokemonSet, displayName: string): string {
  const lines: string[] = [];
  lines.push(set.item ? `${displayName} @ ${set.item}` : displayName);
  if (set.ability) lines.push(`Ability: ${set.ability}`);
  if (set.level && set.level !== 100) lines.push(`Level: ${set.level}`);
  const evLine = statLine("EVs", set.spread.evs, 0);
  if (evLine) lines.push(evLine);
  if (set.nature) lines.push(`${set.nature} Nature`);
  const ivLine = statLine("IVs", set.spread.ivs, 31);
  if (ivLine) lines.push(ivLine);
  for (const m of set.moves) lines.push(`- ${m}`);
  return lines.join("\n");
}

/** Format a whole team. `nameForSlug` maps a member's species slug to a name. */
export function formatShowdownTeam(
  members: PokemonSet[],
  nameForSlug: (slug: string) => string,
): string {
  return members
    .map((m) => formatShowdownSet(m, nameForSlug(m.species)))
    .join("\n\n");
}

export interface ParsedShowdownSet {
  /** Species display name as written (caller resolves to a slug). */
  speciesName: string;
  level: number;
  ability: string | null;
  item: string | null;
  nature: string;
  moves: string[];
  evs: Record<StatKey, number>;
  ivs: Record<StatKey, number>;
}

function parseStatBlock(rest: string, base: Record<StatKey, number>): Record<StatKey, number> {
  const out = { ...base };
  for (const chunk of rest.split("/")) {
    const m = chunk.trim().match(/^(\d+)\s+([A-Za-z]+)$/);
    if (!m) continue;
    const key = LABEL_STAT[m[2]!.toLowerCase()];
    if (key) out[key] = Math.max(0, Math.min(255, Number(m[1])));
  }
  return out;
}

/** Parse the first line: "Nickname (Species) (M) @ Item". */
function parseHeader(line: string): { speciesName: string; item: string | null } {
  let rest = line.trim();
  let item: string | null = null;
  const at = rest.lastIndexOf(" @ ");
  if (at !== -1) {
    item = rest.slice(at + 3).trim() || null;
    rest = rest.slice(0, at).trim();
  }
  // Strip a trailing gender marker.
  rest = rest.replace(/\s*\((?:M|F)\)\s*$/i, "").trim();
  // If a "(Species)" group remains, the leading text was a nickname.
  const paren = rest.match(/\(([^)]+)\)\s*$/);
  const speciesName = paren ? paren[1]!.trim() : rest;
  return { speciesName, item };
}

/** Parse a Showdown team paste into raw sets (species by name). */
export function parseShowdownTeam(text: string): ParsedShowdownSet[] {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const sets: ParsedShowdownSet[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    const { speciesName, item } = parseHeader(lines[0]!);
    if (!speciesName) continue;

    const set: ParsedShowdownSet = {
      speciesName,
      level: 100,
      ability: null,
      item,
      nature: "Serious",
      moves: [],
      evs: zeroStats(),
      ivs: maxIvs(),
    };

    for (const line of lines.slice(1)) {
      if (line.startsWith("- ") || line.startsWith("-\t")) {
        if (set.moves.length < 4) set.moves.push(line.slice(1).trim());
      } else if (/^Ability:/i.test(line)) {
        set.ability = line.replace(/^Ability:/i, "").trim() || null;
      } else if (/^Level:/i.test(line)) {
        const n = Number(line.replace(/^Level:/i, "").trim());
        if (Number.isFinite(n)) set.level = Math.max(1, Math.min(100, n));
      } else if (/^EVs:/i.test(line)) {
        set.evs = parseStatBlock(line.replace(/^EVs:/i, ""), zeroStats());
      } else if (/^IVs:/i.test(line)) {
        set.ivs = parseStatBlock(line.replace(/^IVs:/i, ""), maxIvs());
      } else if (/\bNature$/i.test(line)) {
        const name = line.replace(/\s*Nature$/i, "").trim();
        if (NATURES[name]) set.nature = name;
      }
    }
    sets.push(set);
  }
  return sets;
}
