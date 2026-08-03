// Refresh the committed tournament-usage snapshot from the Limitless TCG API.
//
// Runs OUT OF BAND in CI (see .github/workflows/refresh-usage.yml). GitHub
// Actions can reach play.limitlesstcg.com; the deployed app never does — it
// serves the committed snapshot only, so no external call is made at request
// time and the aggregated data stays inside this private repo.
//
// Open team sheets carry species / item / ability / tera / nature / moves, but
// NOT EV spreads — so this feeds Popular items/moves/abilities/tera/natures,
// not EV spreads.
//
// Faithful (simplified) port of MunchStats' limitless_stats.py. Format ids on
// Limitless differ from Showdown's; set LIMITLESS_FORMAT to the right id (the
// script lists the available VGC formats if it can't resolve one).

import { writeFileSync } from "node:fs";
import { Dex } from "@pkmn/dex";
import { CHAMPIONS_FORMAT, CHAMPIONS_FORMAT_LABEL, usageKey } from "../src/data/usageStats";

const API = "https://play.limitlesstcg.com/api";
const API_KEY = process.env.LIMITLESS_API_KEY || "";
const MIN_PLAYERS = 25;
const WINDOW_DAYS = 30;
const TOP_N = 8;
const OUT = `src/data/fixtures/usage/tournaments-${CHAMPIONS_FORMAT}.json`;

interface Slot {
  id?: string;
  name?: string;
  item?: string;
  ability?: string;
  tera?: string;
  nature?: string;
  attacks?: string[];
}
interface Standing {
  placing?: number;
  decklist?: Slot[] | null;
}
interface Tournament {
  id: string;
  name?: string;
  date?: string;
  format?: string;
  players?: number;
}

async function api<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const headers: Record<string, string> = {
    "User-Agent": "AssaultDex tournament stats refresh",
  };
  if (API_KEY) headers["X-Access-Key"] = API_KEY;
  try {
    const res = await fetch(API + path + qs, { headers });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const clean = (v?: string): string => {
  const s = (v ?? "").trim();
  return s.toLowerCase() === "none" ? "" : s;
};

// Held Mega stone / Primal orb (normalised) -> forme name, so "Charizard" +
// Charizardite Y counts as Charizard-Mega-Y (metas are defined by the choice).
const stoneToForme: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const s of Dex.species.all()) {
    const req = s.requiredItem;
    if (req && (s.forme.includes("Mega") || s.forme.includes("Primal"))) {
      out[usageKey(req)] = s.name;
    }
  }
  return out;
})();

function resolveName(slot: Slot): string {
  for (const cand of [slot.id, slot.name]) {
    if (!cand) continue;
    const sp = Dex.species.get(cand);
    if (sp.exists) {
      const item = clean(slot.item);
      const forme = item ? stoneToForme[usageKey(item)] : undefined;
      if (forme && Dex.species.get(forme).baseSpecies === sp.baseSpecies) return forme;
      return sp.name;
    }
  }
  return slot.name || slot.id || "";
}

function topN(counts: Record<string, number>, denom: number): { name: string; pct: number }[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([name, c]) => ({ name, pct: +((100 * c) / denom).toFixed(1) }));
}

async function main() {
  // 1. Resolve the Limitless format id.
  const games = await api<{ id: string; formats?: Record<string, string> }[]>("/games");
  const vgc = games?.find((g) => g.id === "VGC");
  const formats = vgc?.formats ?? {};
  const formatId =
    process.env.LIMITLESS_FORMAT ||
    Object.keys(formats).find((id) => /reg[-\s]?m/i.test(id + " " + (formats[id] ?? "")));
  if (!formatId) {
    console.error(
      "Could not resolve a Limitless format. Set LIMITLESS_FORMAT to one of:\n" +
        Object.entries(formats)
          .map(([id, name]) => `  ${id}  (${name})`)
          .join("\n"),
    );
    process.exit(1);
  }
  console.log(`Using Limitless format: ${formatId} (${formats[formatId] ?? "?"})`);

  // 2. Recent, sizeable tournaments for that format.
  const windowStart = Date.now() - WINDOW_DAYS * 86400_000;
  const nameToken = new RegExp(
    "(?<![a-z0-9])" + formatId.split("-").map((p) => p.replace(/[^a-z0-9]/gi, "")).join("[-\\s]?") + "(?![a-z0-9])",
    "i",
  );
  const all = (await api<Tournament[]>("/tournaments", { game: "VGC", limit: "500" })) ?? [];
  const eligible = all.filter((t) => {
    const named = nameToken.test(t.name ?? "");
    const matches = named || t.format === formatId;
    const recent = t.date ? Date.parse(t.date) >= windowStart : true;
    return matches && recent && (t.players ?? 0) >= MIN_PLAYERS;
  });
  console.log(`${eligible.length} eligible tournaments`);

  // 3. Aggregate decklists.
  const names: Record<string, string> = {};
  const acc: Record<
    string,
    {
      teams: number;
      items: Record<string, number>;
      abilities: Record<string, number>;
      tera: Record<string, number>;
      natures: Record<string, number>;
      moves: Record<string, number>;
    }
  > = {};
  let totalTeams = 0;

  for (const t of eligible) {
    const standings = await api<Standing[]>(`/tournaments/${t.id}/standings`);
    if (!standings) continue;
    for (const p of standings) {
      if (!p.decklist || p.decklist.length === 0) continue;
      totalTeams++;
      for (const slot of p.decklist) {
        const name = resolveName(slot);
        if (!name) continue;
        const k = usageKey(name);
        names[k] ??= name;
        const m = (acc[k] ??= {
          teams: 0,
          items: {},
          abilities: {},
          tera: {},
          natures: {},
          moves: {},
        });
        m.teams++;
        const item = clean(slot.item);
        const ability = clean(slot.ability);
        const tera = clean(slot.tera);
        const nature = clean(slot.nature);
        if (item) m.items[item] = (m.items[item] || 0) + 1;
        if (ability) m.abilities[ability] = (m.abilities[ability] || 0) + 1;
        if (tera) m.tera[tera] = (m.tera[tera] || 0) + 1;
        if (nature) m.natures[nature] = (m.natures[nature] || 0) + 1;
        for (const raw of slot.attacks ?? []) {
          const mv = clean(raw);
          if (mv) m.moves[mv] = (m.moves[mv] || 0) + 1;
        }
      }
    }
    await new Promise((r) => setTimeout(r, 300)); // politeness
  }

  if (totalTeams === 0) {
    console.error("No decklists found — leaving snapshot unchanged.");
    process.exit(1);
  }

  const mons: Record<string, unknown> = {};
  for (const [k, m] of Object.entries(acc)) {
    mons[k] = {
      name: names[k],
      usage: +((100 * m.teams) / totalTeams).toFixed(1),
      items: topN(m.items, m.teams),
      abilities: topN(m.abilities, m.teams),
      moves: topN(m.moves, m.teams),
      tera: topN(m.tera, m.teams),
      natures: topN(m.natures, m.teams),
    };
  }

  const out = {
    format: CHAMPIONS_FORMAT,
    label: CHAMPIONS_FORMAT_LABEL,
    source: "Limitless TCG",
    tournaments: eligible.length,
    teams: totalTeams,
    updated: new Date().toISOString().slice(0, 10),
    mons,
  };
  writeFileSync(OUT, JSON.stringify(out) + "\n");
  console.log(`Wrote ${OUT}: ${Object.keys(mons).length} mons, ${totalTeams} teams`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
