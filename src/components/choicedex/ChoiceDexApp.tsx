"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MonPanel } from "./MonPanel";
import { Recommendations } from "./Recommendations";
import { analyzeLeads } from "@/domain/choicedex/leads";
import { recommend } from "@/domain/choicedex/recommend";
import {
  DEFAULT_FIELD,
  NEUTRAL_STAGES,
  type Combatant,
  type StageStats,
  type StatusCondition,
  type Terrain,
  type Weather,
} from "@/domain/types/battle";
import type { PokemonType, StatKey } from "@/domain/types/pokemon";
import { TypeBadge } from "@/components/ui";
import { PokeIcon } from "@/components/PokeIcon";
import {
  buildStateWithEntry,
  combatantFromRef,
  emptySlot,
  COMMON_ITEMS,
  type PokemonRef,
  type SideForm,
  type SlotForm,
  type TurnForm,
} from "@/lib/choicedexBuild";

export interface KnownSet {
  evs: Partial<Record<StatKey, number>>;
  nature: string;
  item: string;
  ability: string;
  /** The team's confirmed moves for this species (restricts the readout). */
  moves?: string[];
}
export interface SavedTeam {
  id: string;
  name: string;
  members: string[]; // species slugs
  /** Known sets by species slug, so our own mons prefill their EVs/nature/item. */
  sets?: Record<string, KnownSet>;
}

type Side = "user" | "opponent";
// Abilities a move can grant that may not be native to any pool species, plus
// a "(none)" sentinel for ability suppression (Gastro Acid / Neutralizing Gas).
const ABILITY_CHANGE_RESULTS = ["(none)", "Simple", "Insomnia", "Truant"];
const WEATHERS: Weather[] = ["none", "sun", "rain", "sand", "snow"];
const TERRAINS: Terrain[] = ["none", "electric", "grassy", "misty", "psychic"];
const STATUSES: StatusCondition[] = ["none", "burn", "paralysis", "poison", "toxic", "sleep", "freeze"];

function emptyTeam(): (string | null)[] {
  return [null, null, null, null, null, null];
}

/** Selectable battle-stage backgrounds — a sky band over a ground band with a
 *  soft horizon glow, evoking in-game stages without any external image. */
const BACKGROUNDS: { id: string; label: string; background: string }[] = [
  {
    id: "meadow",
    label: "Meadow",
    background:
      "radial-gradient(120% 60% at 50% 38%, rgba(255,255,255,.18), transparent 60%), linear-gradient(to bottom, #38bdf8 0%, #7dd3fc 42%, #4ade80 52%, #15803d 100%)",
  },
  {
    id: "ocean",
    label: "Ocean",
    background:
      "radial-gradient(120% 55% at 50% 40%, rgba(255,255,255,.15), transparent 60%), linear-gradient(to bottom, #7dd3fc 0%, #38bdf8 45%, #0e7490 55%, #0c4a6e 100%)",
  },
  {
    id: "volcano",
    label: "Volcano",
    background:
      "radial-gradient(120% 55% at 50% 65%, rgba(249,115,22,.5), transparent 55%), linear-gradient(to bottom, #7f1d1d 0%, #450a0a 50%, #1c1917 100%)",
  },
  {
    id: "cave",
    label: "Cave",
    background:
      "radial-gradient(90% 50% at 50% 30%, rgba(148,163,184,.25), transparent 60%), linear-gradient(to bottom, #334155 0%, #1e293b 55%, #020617 100%)",
  },
  {
    id: "night",
    label: "Night sky",
    background:
      "radial-gradient(1px 1px at 20% 25%, #fff, transparent), radial-gradient(1px 1px at 70% 15%, #fff, transparent), radial-gradient(1px 1px at 45% 35%, #cbd5e1, transparent), linear-gradient(to bottom, #1e1b4b 0%, #0f172a 55%, #020617 100%)",
  },
  {
    id: "stadium",
    label: "Stadium",
    background:
      "radial-gradient(120% 60% at 50% 30%, rgba(217,70,239,.25), transparent 60%), linear-gradient(to bottom, #4a044e 0%, #1e1b4b 48%, #14532d 56%, #052e16 100%)",
  },
];
const bgStyle = (id: string) => ({
  background: (BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0]!).background,
});

const SESSION_KEY = "choicedex.session.v1";
const BATTLE_KEY = "choicedex.battle.v1";

/** Item dropdown options: the common list plus the current value if unlisted,
 *  so a saved-team item outside COMMON_ITEMS still displays as selected. */
function itemOptions(current: string): string[] {
  return current && !(COMMON_ITEMS as readonly string[]).includes(current)
    ? [current, ...COMMON_ITEMS]
    : [...COMMON_ITEMS];
}

export function ChoiceDexApp({
  pokemon,
  teams,
}: {
  pokemon: PokemonRef[];
  teams: SavedTeam[];
}) {
  const bySlug = useMemo(() => new Map(pokemon.map((p) => [p.slug, p])), [pokemon]);
  // Every ability across the pool, plus the results of ability-changing moves,
  // so a card can be set to an off-species ability (Skill Swap, Simple Beam, …).
  const allAbilities = useMemo(() => {
    const set = new Set<string>(pokemon.flatMap((p) => p.abilities));
    for (const a of ABILITY_CHANGE_RESULTS) set.add(a);
    return [...set].sort();
  }, [pokemon]);
  const [phase, setPhase] = useState<"preview" | "battle">("preview");
  const [userTeam, setUserTeam] = useState<(string | null)[]>(emptyTeam());
  const [oppTeam, setOppTeam] = useState<(string | null)[]>(emptyTeam());
  // Known sets for mons loaded from a saved team, keyed `side:slug` — prefill.
  const [loadedSets, setLoadedSets] = useState<Record<string, KnownSet>>({});

  // Persist the preview/session so switching tabs and returning reopens it.
  const sessionFirst = useRef(true);
  useEffect(() => {
    if (sessionFirst.current) {
      sessionFirst.current = false;
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          if (Array.isArray(s.userTeam)) setUserTeam(s.userTeam);
          if (Array.isArray(s.oppTeam)) setOppTeam(s.oppTeam);
          if (s.loadedSets) setLoadedSets(s.loadedSets);
          if (s.phase === "battle") setPhase("battle");
        }
      } catch {
        /* ignore corrupt storage */
      }
      return;
    }
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ phase, userTeam, oppTeam, loadedSets }));
    } catch {
      /* ignore quota */
    }
  }, [phase, userTeam, oppTeam, loadedSets]);

  const userCount = userTeam.filter(Boolean).length;
  const oppCount = oppTeam.filter(Boolean).length;
  const canStart = userCount >= 2 && oppCount >= 2;

  const setSlot = (side: Side, idx: number, slug: string | null) => {
    const setter = side === "user" ? setUserTeam : setOppTeam;
    setter((t) => t.map((s, i) => (i === idx ? slug : s)));
  };
  const loadTeam = (side: Side, teamId: string) => {
    const t = teams.find((x) => x.id === teamId);
    const filled = emptyTeam().map((_, i) => t?.members[i] ?? null);
    (side === "user" ? setUserTeam : setOppTeam)(filled);
    if (t?.sets) {
      setLoadedSets((prev) => {
        const next = { ...prev };
        for (const [slug, set] of Object.entries(t.sets!)) next[`${side}:${slug}`] = set;
        return next;
      });
    }
  };

  // ---- Preview / lead phase (hooks must run every render) -------------------
  const leads = useMemo(() => {
    const toC = (team: (string | null)[]) =>
      team
        .filter((s): s is string => !!s)
        .map((s) => bySlug.get(s))
        .filter(Boolean)
        .map((ref) => combatantFromRef(ref!, emptySlot(ref!.slug)));
    const u = toC(userTeam);
    const o = toC(oppTeam);
    if (u.length < 2 || o.length < 2) return [];
    return analyzeLeads({ userCandidates: u, opponentCandidates: o, field: DEFAULT_FIELD }).slice(0, 8);
  }, [userTeam, oppTeam, bySlug]);

  const nameOf = (slug: string) => bySlug.get(slug)?.name ?? slug;

  if (phase === "battle") {
    return (
      <BattleView
        bySlug={bySlug}
        allAbilities={allAbilities}
        userTeam={userTeam.filter((s): s is string => !!s)}
        oppTeam={oppTeam.filter((s): s is string => !!s)}
        loadedSets={loadedSets}
        onBack={() => setPhase("preview")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <TeamColumn
          title="Your team"
          side="user"
          team={userTeam}
          teams={teams}
          pokemon={pokemon}
          onLoad={(id) => loadTeam("user", id)}
          onSet={(i, s) => setSlot("user", i, s)}
        />
        <TeamColumn
          title="Opponent team"
          side="opponent"
          team={oppTeam}
          teams={teams}
          pokemon={pokemon}
          onLoad={(id) => loadTeam("opponent", id)}
          onSet={(i, s) => setSlot("opponent", i, s)}
        />
      </div>

      <div className="flex justify-center">
        <button
          disabled={!canStart}
          onClick={() => setPhase("battle")}
          className="rounded-full bg-amber-500 px-6 py-2 font-bold text-black hover:bg-amber-400 disabled:opacity-40"
          title={canStart ? "" : "Pick at least 2 on each side"}
        >
          ⚔ Start battle
        </button>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Best opening pairs
        </h3>
        {leads.length === 0 ? (
          <p className="text-sm text-slate-500">
            Add at least 2 Pokémon to each team to rank opening pairs.
          </p>
        ) : (
          <ol className="space-y-2">
            {leads.map((l, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded border border-slate-800 p-2 text-sm">
                <span className="rounded bg-amber-500 px-2 py-0.5 text-xs font-bold text-black">#{i + 1}</span>
                <span className="font-medium">
                  {nameOf(l.lead[0])} + {nameOf(l.lead[1])}
                </span>
                <span className="font-mono text-amber-400">{l.score.toFixed(3)}</span>
                <span className="text-xs text-slate-500">
                  best vs {nameOf(l.bestAgainst)} · worst vs {nameOf(l.worstAgainst)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function TeamColumn({
  title,
  side,
  team,
  teams,
  pokemon,
  onLoad,
  onSet,
}: {
  title: string;
  side: Side;
  team: (string | null)[];
  teams: SavedTeam[];
  pokemon: PokemonRef[];
  onLoad: (id: string) => void;
  onSet: (idx: number, slug: string | null) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const bySlug = useMemo(() => new Map(pokemon.map((p) => [p.slug, p])), [pokemon]);

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
        <select
          defaultValue=""
          onChange={(e) => { if (e.target.value) onLoad(e.target.value); e.target.value = ""; }}
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
        >
          <option value="">{side === "opponent" ? "Load prebuilt…" : "Load your team…"}</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {team.map((slug, i) => {
          const p = slug ? bySlug.get(slug) : undefined;
          return (
            <div key={i} className="relative">
              <button
                onClick={() => setEditing(editing === i ? null : i)}
                className={`flex h-16 w-full flex-col items-center justify-center rounded border text-center ${
                  p ? "border-slate-700 bg-slate-800/60" : "border-dashed border-slate-700 hover:border-amber-500"
                }`}
              >
                {p ? (
                  <>
                    <span className="truncate px-1 text-xs font-medium">{p.name}</span>
                    <span className="mt-1 flex gap-0.5">
                      {p.types.map((t) => <TypeBadge key={t} type={t as PokemonType} />)}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl text-slate-600">+</span>
                )}
              </button>
              {editing === i && (
                <SlotPicker
                  pokemon={pokemon}
                  onPick={(s) => { onSet(i, s); setEditing(null); }}
                  onClear={() => { onSet(i, null); setEditing(null); }}
                  onClose={() => setEditing(null)}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SlotPicker({
  pokemon,
  onPick,
  onClear,
  onClose,
}: {
  pokemon: PokemonRef[];
  onPick: (slug: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const n = q.trim().toLowerCase();
    const list = n
      ? pokemon.filter(
          (p) =>
            p.name.toLowerCase().includes(n) ||
            p.types.some((t) => t.toLowerCase().includes(n)) ||
            p.abilities.some((a) => a.toLowerCase().includes(n)),
        )
      : pokemon;
    return list.slice(0, 40);
  }, [q, pokemon]);

  return (
    <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded border border-slate-700 bg-slate-900 p-2 shadow-xl">
      <div className="mb-1 flex gap-1">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
        />
        <button onClick={onClose} className="rounded border border-slate-700 px-2 text-xs">✕</button>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {results.map((p) => (
          <button
            key={p.slug}
            onClick={() => onPick(p.slug)}
            className="flex w-full items-center justify-between gap-1 rounded px-2 py-1 text-left text-xs hover:bg-slate-800"
          >
            <span className="truncate">{p.name}</span>
            <span className="flex shrink-0 gap-0.5">
              {p.types.map((t) => <TypeBadge key={t} type={t as PokemonType} />)}
            </span>
          </button>
        ))}
      </div>
      <button onClick={onClear} className="mt-1 w-full rounded border border-slate-700 py-0.5 text-xs text-slate-400 hover:border-rose-500">
        Clear slot
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Battle view: game-like layout + live recommendations.
// ---------------------------------------------------------------------------

/** Per-Pokémon battle state, tracked by species slug and persisted across
 *  switches (HP, status, item, ability, spread, and stages stay with the mon). */
interface MonState {
  hpPct: number;
  status: StatusCondition;
  ability: string;
  item: string;
  /** Whether the held item has been consumed (Berry eaten, Sash/Orb spent, …). */
  itemUsed: boolean;
  nature: string;
  evs: Partial<Record<StatKey, number>>;
  stages: StageStats;
  /** Treat this Pokémon's moves as critical hits in the damage readout. */
  crit: boolean;
  /** Moves confirmed used (opponent side): now known 100%, highlighted. */
  knownMoves: string[];
}
const emptyMon = (): MonState => ({
  hpPct: 100,
  status: "none",
  ability: "",
  item: "None",
  itemUsed: false,
  nature: "Serious",
  evs: {},
  stages: { ...NEUTRAL_STAGES },
  crit: false,
  knownMoves: [],
});

/** One side's field conditions: screens, Tailwind, and entry hazards. */
interface SideCond {
  tailwind: boolean;
  reflect: boolean;
  lightScreen: boolean;
  auroraVeil: boolean;
  stealthRock: boolean;
  spikes: number;
  toxicSpikes: number;
  stickyWeb: boolean;
}
const emptyCond = (): SideCond => ({
  tailwind: false,
  reflect: false,
  lightScreen: false,
  auroraVeil: false,
  stealthRock: false,
  spikes: 0,
  toxicSpikes: 0,
  stickyWeb: false,
});
const hasHazards = (c: SideCond): boolean =>
  c.stealthRock || c.spikes > 0 || c.toxicSpikes > 0 || c.stickyWeb;

function monFromSet(set: KnownSet | undefined): MonState {
  const base = emptyMon();
  if (!set) return base;
  return {
    ...base,
    evs: set.evs ?? {},
    nature: set.nature || base.nature,
    item: set.item || base.item,
    ability: set.ability || base.ability,
  };
}

function BattleView({
  bySlug,
  allAbilities,
  userTeam,
  oppTeam,
  loadedSets,
  onBack,
}: {
  bySlug: Map<string, PokemonRef>;
  allAbilities: string[];
  userTeam: string[];
  oppTeam: string[];
  loadedSets: Record<string, KnownSet>;
  onBack: () => void;
}) {
  const refBySlug = bySlug;
  const [round, setRound] = useState(1);
  // Teams are held in state so "swap sides" can flip perspective mid-battle.
  const [uTeam, setUTeam] = useState<string[]>(userTeam);
  const [oTeam, setOTeam] = useState<string[]>(oppTeam);
  // Which team member occupies each of the two active spots per side.
  const [activeUser, setActiveUser] = useState<[string | null, string | null]>([
    userTeam[0] ?? null,
    userTeam[1] ?? null,
  ]);
  const [activeOpp, setActiveOpp] = useState<[string | null, string | null]>([
    oppTeam[0] ?? null,
    oppTeam[1] ?? null,
  ]);
  // Per-Pokémon battle state, keyed by SIDE + species slug so the user's and the
  // opponent's copy of the same species are independent (a mirror match keeps two
  // separate HP bars), while HP/status/item persist across that side's switches.
  const monKey = (side: Side, slug: string) => `${side}:${slug}`;
  const [mon, setMon] = useState<Record<string, MonState>>(() => {
    const init: Record<string, MonState> = {};
    for (const s of userTeam) init[monKey("user", s)] = monFromSet(loadedSets[`user:${s}`]);
    for (const s of oppTeam) init[monKey("opponent", s)] = monFromSet(loadedSets[`opponent:${s}`]);
    return init;
  });
  const [weather, setWeather] = useState<Weather>("none");
  const [terrain, setTerrain] = useState<Terrain>("none");
  const [trickRoom, setTrickRoom] = useState(false);
  const [gravity, setGravity] = useState(false);
  const [uCond, setUCond] = useState<SideCond>(emptyCond());
  const [oCond, setOCond] = useState<SideCond>(emptyCond());
  const [background, setBackground] = useState<string>("meadow");

  // Stable signature of the battle's Pokémon (order/side-independent), so a saved
  // battle is only resumed when it is the same battle — not after picking new teams.
  const teamSig = useMemo(
    () => [...userTeam, ...oppTeam].slice().sort().join("|"),
    [userTeam, oppTeam],
  );

  // Persist the whole battle so leaving and returning to the tab reopens it.
  const battleFirst = useRef(true);
  useEffect(() => {
    if (battleFirst.current) {
      battleFirst.current = false;
      try {
        const raw = localStorage.getItem(BATTLE_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          if (s.sig !== teamSig) return; // stale battle for different teams
          if (Array.isArray(s.uTeam)) setUTeam(s.uTeam);
          if (Array.isArray(s.oTeam)) setOTeam(s.oTeam);
          if (s.activeUser) setActiveUser(s.activeUser);
          if (s.activeOpp) setActiveOpp(s.activeOpp);
          if (s.mon) setMon(s.mon);
          if (s.weather) setWeather(s.weather);
          if (s.terrain) setTerrain(s.terrain);
          if (typeof s.trickRoom === "boolean") setTrickRoom(s.trickRoom);
          if (typeof s.gravity === "boolean") setGravity(s.gravity);
          if (s.uCond) setUCond(s.uCond);
          if (s.oCond) setOCond(s.oCond);
          if (typeof s.round === "number") setRound(s.round);
          if (s.background) setBackground(s.background);
        }
      } catch {
        /* ignore corrupt storage */
      }
      return;
    }
    try {
      localStorage.setItem(
        BATTLE_KEY,
        JSON.stringify({ sig: teamSig, uTeam, oTeam, activeUser, activeOpp, mon, weather, terrain, trickRoom, gravity, uCond, oCond, round, background }),
      );
    } catch {
      /* ignore quota */
    }
  }, [teamSig, uTeam, oTeam, activeUser, activeOpp, mon, weather, terrain, trickRoom, gravity, uCond, oCond, round, background]);

  const monOf = (side: Side, slug: string | null): MonState =>
    (slug && mon[monKey(side, slug)]) || emptyMon();
  const patchMon = (side: Side, slug: string | null, p: Partial<MonState>) => {
    if (!slug) return;
    const k = monKey(side, slug);
    setMon((m) => ({ ...m, [k]: { ...(m[k] ?? emptyMon()), ...p } }));
  };
  const setActive = (side: Side, idx: 0 | 1, slug: string | null) =>
    (side === "user" ? setActiveUser : setActiveOpp)((a) => {
      const next = [...a] as [string | null, string | null];
      next[idx] = slug;
      return next;
    });

  const toSlot = (side: Side, slug: string): SlotForm => {
    const s = monOf(side, slug);
    // A consumed item no longer applies to damage/speed.
    return {
      ...emptySlot(slug),
      hpPct: s.hpPct,
      status: s.status,
      ability: s.ability,
      item: s.itemUsed ? "None" : s.item,
      nature: s.nature,
      evs: s.evs,
      stages: s.stages,
    };
  };

  const allySwitch = (side: Side) =>
    (side === "user" ? setActiveUser : setActiveOpp)((a) => [a[1], a[0]]);

  // Swap which team is "yours": flip teams, active spots, side conditions, and
  // re-key each mon's battle state so HP/status follow its Pokémon.
  const swapSides = () => {
    setUTeam(oTeam);
    setOTeam(uTeam);
    setActiveUser(activeOpp);
    setActiveOpp(activeUser);
    setUCond(oCond);
    setOCond(uCond);
    setMon((m) => {
      const next: Record<string, MonState> = {};
      for (const [k, v] of Object.entries(m)) {
        next[k.startsWith("user:") ? "opponent:" + k.slice(5) : "user:" + k.slice(10)] = v;
      }
      return next;
    });
  };

  const built = useMemo(() => {
    const [u0, u1] = activeUser;
    const [o0, o1] = activeOpp;
    if (!u0 || !u1 || !o0 || !o1) return null;
    const side = (sd: Side, slugs: [string, string], c: SideCond): SideForm => ({
      slots: [toSlot(sd, slugs[0]), toSlot(sd, slugs[1])],
      ...c,
    });
    const form: TurnForm = {
      user: side("user", [u0, u1], uCond),
      opponent: side("opponent", [o0, o1], oCond),
      weather,
      terrain,
      trickRoom,
      gravity,
      note: "",
    };
    return buildStateWithEntry(form, refBySlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUser, activeOpp, mon, weather, terrain, trickRoom, gravity, uCond, oCond, refBySlug]);

  const recommendations = useMemo(
    () => (built?.state ? recommend(built.state, { limit: 6 }) : []),
    [built],
  );

  const abilitiesFor = (slug: string | null) => (slug ? refBySlug.get(slug)?.abilities ?? [] : []);
  // Legal options for a spot: the side's team minus whoever is in the OTHER spot
  // (a Pokémon can't be in both active spots at once).
  const optionsFor = (
    side: Side,
    team: string[],
    active: [string | null, string | null],
    idx: 0 | 1,
  ) => {
    const sibling = active[idx === 0 ? 1 : 0];
    const current = active[idx];
    return team
      // Exclude the sibling (can't be in both spots) and fainted Pokémon — but
      // always keep whoever currently occupies this spot so it stays visible.
      .filter((s) => s !== sibling && (s === current || monOf(side, s).hpPct > 0))
      .map((s) => ({ slug: s, name: refBySlug.get(s)?.name ?? s }));
  };

  const userAlive = uTeam.filter((s) => monOf("user", s).hpPct > 0).length;
  const oppAlive = oTeam.filter((s) => monOf("opponent", s).hpPct > 0).length;
  const battleOver = userAlive === 0 || oppAlive === 0;

  return (
    <div className="space-y-4">
      {/* Top bar: back, round, background picker, and the Next Round action so it
          is always reachable without scrolling. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onBack} className="text-sm text-amber-400 hover:underline">← Team preview</button>
        <div className="flex items-center gap-2 text-xs">
          <span className="uppercase tracking-wide text-slate-500">Round {round}</span>
          <label className="flex items-center gap-1 text-slate-400">
            Stage
            <select
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5"
            >
              {BACKGROUNDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </label>
          {battleOver ? (
            <button
              onClick={() => {
                try { localStorage.removeItem(BATTLE_KEY); } catch { /* ignore */ }
                onBack();
              }}
              className="rounded bg-amber-500 px-3 py-1 font-semibold text-black hover:bg-amber-400"
            >
              New battle
            </button>
          ) : (
            <button onClick={() => setRound((r) => r + 1)} className="rounded bg-amber-500 px-3 py-1 font-semibold text-black hover:bg-amber-400">
              Next round →
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Battle screen: opponent top-right, you bottom-left */}
        <div className="relative min-h-[280px] overflow-hidden rounded-lg border border-slate-800 p-3" style={bgStyle(background)}>
          <div className="absolute right-3 top-3 flex gap-2">
            {[0, 1].map((i) => {
              const slug = activeOpp[i as 0 | 1];
              return (
                <ActiveCard
                  key={i}
                  label="Opp"
                  foe
                  slug={slug}
                  state={monOf("opponent", slug)}
                  options={optionsFor("opponent", oTeam, activeOpp, i as 0 | 1)}
                  abilities={allAbilities}
                  defaultAbility={abilitiesFor(slug)[0] ?? ""}
                  onSelect={(s) => {
                    setActive("opponent", i as 0 | 1, s);
                    if (s && s !== slug) patchMon("opponent", s, { stages: NEUTRAL_STAGES });
                  }}
                  onPatch={(p) => patchMon("opponent", slug, p)}
                />
              );
            })}
          </div>
          <div className="absolute bottom-3 left-3 flex gap-2">
            {[0, 1].map((i) => {
              const slug = activeUser[i as 0 | 1];
              return (
                <ActiveCard
                  key={i}
                  label="You"
                  slug={slug}
                  state={monOf("user", slug)}
                  options={optionsFor("user", uTeam, activeUser, i as 0 | 1)}
                  abilities={allAbilities}
                  defaultAbility={abilitiesFor(slug)[0] ?? ""}
                  onSelect={(s) => {
                    setActive("user", i as 0 | 1, s);
                    if (s && s !== slug) patchMon("user", s, { stages: NEUTRAL_STAGES });
                  }}
                  onPatch={(p) => patchMon("user", slug, p)}
                />
              );
            })}
          </div>
        </div>

        {/* Field & per-side tools, split so each side is unmistakable. */}
        <div className="space-y-3 text-xs text-slate-300">
          {/* Shared field */}
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Field (both sides)</h3>
            <label className="flex items-center justify-between gap-2">
              Weather
              <select value={weather} onChange={(e) => setWeather(e.target.value as Weather)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
                {WEATHERS.map((w) => <option key={w}>{w}</option>)}
              </select>
            </label>
            <label className="flex items-center justify-between gap-2">
              Terrain
              <select value={terrain} onChange={(e) => setTerrain(e.target.value as Terrain)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
                {TERRAINS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={trickRoom} onChange={(e) => setTrickRoom(e.target.checked)} /> Trick Room
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={gravity} onChange={(e) => setGravity(e.target.checked)} /> Gravity
              </label>
            </div>
          </div>

          {/* Your side */}
          <div className="space-y-2 rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              🟢 Your side
              {hasHazards(uCond) && <span className="text-[10px] text-amber-300">⚠ hazards up</span>}
            </h3>
            <ConditionRow label="Screens &amp; hazards" cond={uCond} onChange={setUCond} />
            <button onClick={() => allySwitch("user")} className="rounded border border-emerald-700 px-2 py-0.5 hover:border-emerald-400">
              Ally Switch
            </button>
          </div>

          {/* Opponent side */}
          <div className="space-y-2 rounded-lg border border-rose-800/60 bg-rose-950/20 p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-rose-300">
              🔴 Opponent side
              {hasHazards(oCond) && <span className="text-[10px] text-amber-300">⚠ hazards up</span>}
            </h3>
            <ConditionRow label="Screens &amp; hazards" cond={oCond} onChange={setOCond} />
            <button onClick={() => allySwitch("opponent")} className="rounded border border-rose-700 px-2 py-0.5 hover:border-rose-400">
              Ally Switch
            </button>
          </div>
        </div>
      </div>

      {/* Remaining Pokémon per side, clearly labelled, with HP/status warnings. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">🟢 Your team</p>
          <div className="flex flex-wrap gap-1.5">
            {uTeam.map((s) => (
              <MonChip key={s} name={refBySlug.get(s)?.name ?? s} slug={s} state={monOf("user", s)} />
            ))}
          </div>
        </div>
        <button
          onClick={swapSides}
          title="Swap which side is yours"
          className="mt-4 shrink-0 rounded border border-slate-700 px-2 py-1 text-xs hover:border-amber-500"
        >
          ⇄ Swap
        </button>
        <div className="text-right">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-rose-300">🔴 Opponent&apos;s team</p>
          <div className="flex flex-wrap justify-end gap-1.5">
            {oTeam.map((s) => (
              <MonChip key={s} name={refBySlug.get(s)?.name ?? s} slug={s} state={monOf("opponent", s)} />
            ))}
          </div>
        </div>
      </div>

      {/* Showdex-style detail panels: per-move damage/KO + full stat table.
          Top row = your active (green), bottom row = opponent active (red). */}
      {built?.state && (
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide">
          <span className="text-emerald-300">🟢 Your active</span>
          <span className="text-rose-300">🔴 Opponent active</span>
        </div>
      )}
      {built?.state && (
        <div className="grid gap-3 md:grid-cols-2">
          {([
            { key: "u0", slug: activeUser[0], attacker: built.state.user.active[0], enemies: built.state.opponent, own: built.state.user, foe: false },
            { key: "u1", slug: activeUser[1], attacker: built.state.user.active[1], enemies: built.state.opponent, own: built.state.user, foe: false },
            { key: "o0", slug: activeOpp[0], attacker: built.state.opponent.active[0], enemies: built.state.user, own: built.state.opponent, foe: true },
            { key: "o1", slug: activeOpp[1], attacker: built.state.opponent.active[1], enemies: built.state.user, own: built.state.opponent, foe: true },
          ] as const).map((spec) => {
            const ref = spec.slug ? refBySlug.get(spec.slug) : undefined;
            if (!ref || !spec.attacker || !spec.slug) return null;
            const targets = spec.enemies.active
              .filter((c): c is Combatant => c !== null)
              .map((c) => ({ name: c.name, combatant: c }));
            // For OUR mons, restrict the move readout to the team's confirmed set.
            const known = !spec.foe
              ? loadedSets[`user:${spec.slug}`]?.moves ?? loadedSets[`opponent:${spec.slug}`]?.moves
              : undefined;
            const attacker =
              known && known.length
                ? { ...spec.attacker, moves: spec.attacker.moves.filter((mv) => known.includes(mv.name)) }
                : spec.attacker;
            return (
              <MonPanel
                key={spec.key}
                name={ref.name}
                types={ref.types}
                baseStats={ref.baseStats}
                attacker={attacker}
                targets={targets}
                abilities={allAbilities}
                defaultAbility={abilitiesFor(spec.slug)[0] ?? ""}
                field={built.state.field}
                defenderConditions={spec.enemies.conditions}
                ownConditions={spec.own.conditions}
                state={monOf(spec.foe ? "opponent" : "user", spec.slug)}
                onPatch={(p) => patchMon(spec.foe ? "opponent" : "user", spec.slug, p)}
                foe={spec.foe}
              />
            );
          })}
        </div>
      )}

      {battleOver ? (
        <p className="text-sm font-semibold text-amber-300">
          🏆 {userAlive === 0 && oppAlive === 0
            ? "Both sides fainted — draw."
            : userAlive === 0
              ? "Opponent wins — your team fainted."
              : "You win — opponent team fainted."}{" "}
          Use “New battle” above to restart.
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          {userAlive} vs {oppAlive} alive · enter HP/status/field, then “Next round →” at the top.
        </p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Best options</h3>
        {!built?.state ? (
          <p className="text-sm text-rose-400">Assign a Pokémon to all four battle spots.</p>
        ) : (
          <Recommendations recommendations={recommendations} profileLabel="Balanced" />
        )}
      </div>
    </div>
  );
}

/** Coloured status badge classes, echoing the in-game status colours. */
const STATUS_COLOR: Record<string, string> = {
  burn: "bg-orange-600 text-white",
  paralysis: "bg-yellow-500 text-black",
  poison: "bg-fuchsia-700 text-white",
  toxic: "bg-fuchsia-900 text-white",
  sleep: "bg-slate-500 text-white",
  freeze: "bg-cyan-500 text-black",
};

/** Team-overview chip: bigger icon + HP/status warning badges + coloured status. */
function MonChip({ name, slug, state }: { name: string; slug: string; state: MonState }) {
  const fainted = state.hpPct <= 0;
  const warn = !fainted && state.hpPct < 20 ? "red" : !fainted && state.hpPct <= 50 ? "yellow" : null;
  const title =
    `${name} — ${state.hpPct}% HP` +
    (state.status !== "none" ? ` · ${state.status}` : "") +
    (state.ability ? ` · ${state.ability}` : "") +
    (state.item && state.item !== "None" ? ` · ${state.item}` : "");
  return (
    <span
      className={`relative inline-flex h-12 w-12 items-center justify-center overflow-hidden ${fainted ? "opacity-30 grayscale" : ""}`}
      title={title}
    >
      <PokeIcon species={slug} className="scale-[1.35]" />
      {warn && (
        <span
          className={`absolute right-0 top-0 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-black ${
            warn === "red" ? "bg-red-500" : "bg-amber-400"
          }`}
        >
          !
        </span>
      )}
      {!fainted && state.status !== "none" && (
        <span
          className={`absolute bottom-0 left-0 rounded px-0.5 text-[8px] font-semibold uppercase ${
            STATUS_COLOR[state.status] ?? "bg-slate-700 text-slate-200"
          }`}
        >
          {state.status.slice(0, 3)}
        </span>
      )}
    </span>
  );
}

function ActiveCard({
  label,
  foe,
  slug,
  state,
  options,
  abilities,
  defaultAbility,
  onSelect,
  onPatch,
}: {
  label: string;
  foe?: boolean;
  slug: string | null;
  state: MonState;
  options: { slug: string; name: string }[];
  abilities: string[];
  defaultAbility: string;
  onSelect: (slug: string | null) => void;
  onPatch: (p: Partial<MonState>) => void;
}) {
  const hoverInfo = slug
    ? `${slug} — ${state.hpPct}% HP` +
      (state.status !== "none" ? ` · ${state.status}` : "") +
      (state.ability ? ` · ${state.ability}` : "") +
      (state.item && state.item !== "None" ? ` · ${state.item}` : "")
    : undefined;
  return (
    <div
      title={hoverInfo}
      className={`w-40 rounded-lg border p-2 text-xs backdrop-blur ${foe ? "border-rose-800/60 bg-slate-900/70" : "border-emerald-800/60 bg-slate-900/70"}`}
    >
      <div className="mb-1 flex items-center gap-1">
        {slug && (
          <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden">
            <PokeIcon species={slug} className="scale-[1.3]" />
          </span>
        )}
        <span className="text-[10px] uppercase text-slate-500">{label}</span>
      </div>
      <select
        value={slug ?? ""}
        onChange={(e) => onSelect(e.target.value || null)}
        className="mb-1 w-full rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs"
      >
        <option value="">—</option>
        {options.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
      </select>
      <label className="flex items-center gap-1">
        HP
        <input
          type="range" min={0} max={100} value={state.hpPct}
          disabled={!slug}
          onChange={(e) => onPatch({ hpPct: Number(e.target.value) })}
          className="w-full"
        />
        <span className="w-8 text-right tabular-nums">{state.hpPct}%</span>
      </label>
      <select
        value={state.status}
        onChange={(e) => onPatch({ status: e.target.value as StatusCondition })}
        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs"
      >
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {abilities.length > 0 && (
        <select
          value={state.ability || defaultAbility}
          disabled={!slug}
          onChange={(e) => onPatch({ ability: e.target.value })}
          title="Set the current ability (Skill Swap, Simple Beam, …)"
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs"
        >
          {abilities.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      )}
      <select
        value={state.item}
        disabled={!slug}
        onChange={(e) => onPatch({ item: e.target.value })}
        className={`mt-1 w-full rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs ${state.itemUsed ? "text-slate-500 line-through" : ""}`}
      >
        {itemOptions(state.item).map((it) => <option key={it} value={it}>{it}</option>)}
      </select>
      {slug && state.item !== "None" && (
        <label className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
          <input
            type="checkbox"
            checked={state.itemUsed}
            onChange={(e) => onPatch({ itemUsed: e.target.checked })}
          />
          item used (consumed)
        </label>
      )}
    </div>
  );
}

function ConditionRow({
  label,
  cond,
  onChange,
}: {
  label: string;
  cond: SideCond;
  onChange: (c: SideCond) => void;
}) {
  const screens: [keyof SideCond, string][] = [
    ["tailwind", "Tailwind"],
    ["reflect", "Reflect"],
    ["lightScreen", "Light Screen"],
    ["auroraVeil", "Aurora Veil"],
  ];
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {screens.map(([k, lbl]) => (
          <label key={k} className="flex items-center gap-1">
            <input type="checkbox" checked={cond[k] as boolean} onChange={(e) => onChange({ ...cond, [k]: e.target.checked })} />
            {lbl}
          </label>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-slate-400">
        <span className="text-[10px] uppercase text-slate-500">Hazards</span>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={cond.stealthRock} onChange={(e) => onChange({ ...cond, stealthRock: e.target.checked })} />
          SR
        </label>
        <label className="flex items-center gap-1">
          Spikes
          <select value={cond.spikes} onChange={(e) => onChange({ ...cond, spikes: Number(e.target.value) })}
            className="rounded border border-slate-700 bg-slate-900 px-1">
            {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1">
          T.Spikes
          <select value={cond.toxicSpikes} onChange={(e) => onChange({ ...cond, toxicSpikes: Number(e.target.value) })}
            className="rounded border border-slate-700 bg-slate-900 px-1">
            {[0, 1, 2].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={cond.stickyWeb} onChange={(e) => onChange({ ...cond, stickyWeb: e.target.checked })} />
          Web
        </label>
      </div>
    </div>
  );
}
