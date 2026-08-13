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
import { TypeBadge, TYPE_HEX } from "@/components/ui";
import { PokeIcon } from "@/components/PokeIcon";
import { OnceTutorial } from "@/components/OnceTutorial";
import { Walkthrough, type WalkStep } from "@/components/Walkthrough";
import {
  buildStateWithEntry,
  bySlugMap,
  combatantFromRef,
  emptySlot,
  itemOptions,
  type MegaForme,
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

/** Species-specific in-battle form change offered on an active card. */
type SpecialForm =
  // Ditto Transform: copy one of the opposing active Pokémon.
  | { kind: "ditto"; options: { slug: string; name: string }[] }
  // Dondozo Commander boost (an allied Tatsugiri is on the team).
  | { kind: "commander" }
  // Zoroark Illusion: appear as a teammate (cosmetic).
  | { kind: "zoroark"; options: { slug: string; name: string }[] }
  | null;

type Side = "user" | "opponent";
// Abilities a move can grant that may not be native to any pool species, plus
// a "(none)" sentinel for ability suppression (Gastro Acid / Neutralizing Gas).
// Abilities that can be applied in battle by a move/ability even if no mon in
// the match natively has it: Mummy-line (spread on contact), Simple Beam, Worry
// Seed, Entrainment, etc. Plus "(none)" to suppress an ability (Gastro Acid /
// Neutralizing Gas). Skill Swap / Trace / Role Play copy abilities already in
// the match, which are added dynamically per battle.
const ABILITY_CHANGE_RESULTS = [
  "(none)", "Simple", "Insomnia", "Truant", "Mummy", "Lingering Aroma",
  "Wandering Spirit",
];
const WEATHERS: Weather[] = ["none", "sun", "rain", "sand", "snow"];
const TERRAINS: Terrain[] = ["none", "electric", "grassy", "misty", "psychic"];
const STATUSES: StatusCondition[] = ["none", "burn", "paralysis", "poison", "toxic", "sleep", "freeze"];

function emptyTeam(): (string | null)[] {
  return [null, null, null, null, null, null];
}

/** Selectable battle-stage backgrounds - a sky band over a ground band with a
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

/** Step-by-step tour of the ChoiceDex flow (both phases described). */
const CD_TOUR: WalkStep[] = [
  { title: "Welcome to ChoiceDex", body: "ChoiceDex is a live doubles assistant: set up both teams, start the battle, and it ranks your best play each turn. This quick tour explains every part - you can skip it anytime." },
  { title: "Build both teams", body: "Fill each side's slots with Pokémon by clicking an empty tile to search and pick; click a filled tile to change or clear it. Each side needs 2-6 Pokémon with no duplicate species." },
  { title: "Load a saved team", body: "Use the “Load…” dropdown at the top of a column to drop in one of your saved teams. It also prefills that team's EVs, nature, item and moves so the readouts are accurate." },
  { title: "Best opening pairs", body: "Under the teams, ChoiceDex ranks the strongest opening pairs for your side against the opponent, with the best and worst matchups noted." },
  { title: "Start the battle", body: "Once both sides are legal, press “Start battle” to open the live board. If the button is disabled, the note beneath it says why." },
  { title: "The battle board", body: "Each active Pokémon has a card: set its HP, status, ability and item. Mega Evolve, or trigger form changes (Ditto Transform, Zoroark's Illusion, Dondozo's Commander) right here - stats and typing update live." },
  { title: "Field & side conditions", body: "On the right, set weather, terrain, Trick Room and Gravity, plus each side's screens and hazards. Ally Switch and Skill Swap buttons handle those positional plays." },
  { title: "Damage & KO readouts", body: "Below the board, each of your active Pokémon lists per-move damage ranges and KO chances against the opposing active Pokémon." },
  { title: "Best options & next round", body: "The “Best options” list recommends your strongest plays for the turn. After it resolves, update HP/status/field and press “Next round →” to re-rank." },
  { title: "Advanced tools", body: "The Advanced tools section adds opponent stat/speed inference, a batch simulator, and battle analysis. That's the whole tool - enjoy!" },
];

const CD_TIPS = [
  "Doubles is about targeting: focus-fire to remove a threat while keeping both of your Pokémon alive.",
  "Each round, enter what happened - HP, status, field, and switches - and the app re-ranks your best plays.",
  "Predict Protect and double-target reads; positioning, switches, and speed control decide most turns.",
  "Use speed control (Tailwind / Trick Room) and redirection, and play around the opponent's.",
  "Reference: vgcguide.com/battling. Mechanics are provisional - treat recommendations as guidance and sanity-check key calcs.",
];

const SESSION_KEY = "choicedex.session.v2";
const BATTLE_KEY = "choicedex.battle.v2";
// Saved battles older than this are treated as stale (don't reopen yesterday's).
const BATTLE_TTL_MS = 12 * 60 * 60 * 1000;

export function ChoiceDexApp({
  pokemon,
  teams,
  items = [],
  megaForms = {},
}: {
  pokemon: PokemonRef[];
  teams: SavedTeam[];
  items?: string[];
  megaForms?: Record<string, MegaForme>;
}) {
  const bySlug = useMemo(() => bySlugMap(pokemon), [pokemon]);
  const [phase, setPhase] = useState<"preview" | "battle">("preview");
  const [userTeam, setUserTeam] = useState<(string | null)[]>(emptyTeam());
  const [oppTeam, setOppTeam] = useState<(string | null)[]>(emptyTeam());
  // Known sets for mons loaded from a saved team, keyed `side:slug` - prefill.
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
          // Discard a stale session: too old, or referencing species that are no
          // longer in the pool (e.g. after data changes / a deleted team).
          const fresh = typeof s.ts === "number" && Date.now() - s.ts < BATTLE_TTL_MS;
          const speciesOk = [...(s.userTeam ?? []), ...(s.oppTeam ?? [])]
            .filter(Boolean)
            .every((slug: string) => bySlug.has(slug));
          if (fresh && speciesOk) {
            if (Array.isArray(s.userTeam)) setUserTeam(s.userTeam);
            if (Array.isArray(s.oppTeam)) setOppTeam(s.oppTeam);
            if (s.loadedSets) setLoadedSets(s.loadedSets);
            if (s.phase === "battle") setPhase("battle");
          } else {
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(BATTLE_KEY);
          }
        }
      } catch {
        /* ignore corrupt storage */
      }
      return;
    }
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now(), phase, userTeam, oppTeam, loadedSets }));
    } catch {
      /* ignore quota */
    }
  }, [phase, userTeam, oppTeam, loadedSets, bySlug]);

  // A side is battle-legal with 2-6 distinct in-pool species (Species Clause);
  // the battle can only start when both sides are legal.
  const sideIssue = (team: (string | null)[]): string | null => {
    const filled = team.filter((s): s is string => !!s);
    if (filled.length < 2) return "add at least 2 Pokémon";
    if (filled.length > 6) return "keep to at most 6 Pokémon";
    if (new Set(filled).size !== filled.length) return "no duplicate species (Species Clause)";
    if (!filled.every((s) => bySlug.has(s))) return "contains a Pokémon outside the pool";
    return null;
  };
  const userIssue = sideIssue(userTeam);
  const oppIssue = sideIssue(oppTeam);
  const canStart = !userIssue && !oppIssue;
  const startMsg = userIssue
    ? `Your team: ${userIssue}.`
    : oppIssue
      ? `Opponent team: ${oppIssue}.`
      : "";

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
        items={items}
        megaForms={megaForms}
        userTeam={userTeam.filter((s): s is string => !!s)}
        oppTeam={oppTeam.filter((s): s is string => !!s)}
        loadedSets={loadedSets}
        onBack={() => setPhase("preview")}
      />
    );
  }

  const maxLeadScore = Math.max(0.001, ...leads.map((l) => l.score));

  return (
    <div className="space-y-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-bold uppercase tracking-wide text-t2">Set up your battle</span>
        <Walkthrough id="choicedex-tour" steps={CD_TOUR} />
      </div>

      <OnceTutorial id="choicedex" title="How to use ChoiceDex" points={CD_TIPS} />

      {/* Team sheets + start column */}
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_minmax(132px,0.42fr)_1fr]">
        <TeamColumn
          title="Your team" side="user" tone="pos" team={userTeam} teams={teams} pokemon={pokemon}
          issue={userIssue}
          onLoad={(id) => loadTeam("user", id)} onSet={(i, s) => setSlot("user", i, s)}
        />

        <div className="flex flex-col items-stretch gap-2 self-center text-center">
          <button
            disabled={!canStart}
            onClick={() => canStart && setPhase("battle")}
            className="rounded-xl bg-acc px-4 py-3.5 text-sm font-extrabold text-bg hover:bg-accs disabled:opacity-50"
            title={startMsg}
          >
            Start battle
          </button>
          {canStart ? (
            <p className="text-[11px] text-t3">Both sides legal.</p>
          ) : (
            <p className="text-[11px] text-neg">{startMsg}</p>
          )}
        </div>

        <TeamColumn
          title="Opponent team" side="opponent" tone="neg" team={oppTeam} teams={teams} pokemon={pokemon}
          issue={oppIssue}
          onLoad={(id) => loadTeam("opponent", id)} onSet={(i, s) => setSlot("opponent", i, s)}
        />
      </div>

      {/* Pick your lead */}
      <section className="rounded-[14px] border border-line bg-panel p-4">
        <div className="mb-3 flex items-baseline gap-2">
          <h3 className="text-[13px] font-extrabold text-t1">Pick your lead</h3>
          <span className="text-[11px] text-t3">ranked against their six</span>
        </div>
        {leads.length === 0 ? (
          <p className="text-sm text-t3">Add at least 2 Pokémon to each team to rank opening pairs.</p>
        ) : (
          <div className="grid gap-[9px] sm:grid-cols-2 lg:grid-cols-3">
            {leads.slice(0, 6).map((l, i) => (
              <div
                key={i}
                className={`flex flex-col gap-2 rounded-xl p-[11px] ${
                  i === 0 ? "border border-accln bg-accbg" : "border border-line bg-raise"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${i === 0 ? "bg-acc text-bg" : "bg-soft text-t2"}`}>#{i + 1}</span>
                  <span className="font-mono text-[12px] tabular-nums text-t2">{l.score.toFixed(3)}</span>
                </div>
                <div className="flex items-center gap-1">
                  {l.lead.map((s) => (
                    <span key={s} className="inline-flex h-9 w-9 items-center justify-center overflow-hidden">
                      <PokeIcon species={s} className="scale-[1.2]" />
                    </span>
                  ))}
                </div>
                <span className="text-[12px] font-bold text-t1">{nameOf(l.lead[0])} + {nameOf(l.lead[1])}</span>
                <span className="h-1 overflow-hidden rounded bg-soft">
                  <span className="block h-full rounded bg-acc" style={{ width: `${(l.score / maxLeadScore) * 100}%` }} />
                </span>
                <span className="text-[10px] leading-tight text-t3">
                  best vs {nameOf(l.bestAgainst)}<br />worst vs {nameOf(l.worstAgainst)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TeamColumn({
  title,
  side,
  tone,
  team,
  teams,
  pokemon,
  issue,
  onLoad,
  onSet,
}: {
  title: string;
  side: Side;
  tone: "pos" | "neg";
  team: (string | null)[];
  teams: SavedTeam[];
  pokemon: PokemonRef[];
  issue: string | null;
  onLoad: (id: string) => void;
  onSet: (idx: number, slug: string | null) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const bySlug = useMemo(() => bySlugMap(pokemon), [pokemon]);
  const toneVar = tone === "pos" ? "var(--pos)" : "var(--neg)";
  const filled = team.filter(Boolean).length;

  return (
    <section
      className="rounded-[14px] bg-panel p-[14px]"
      style={{ border: `1px solid color-mix(in srgb, ${toneVar} 35%, transparent)` }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="h-[9px] w-[9px] shrink-0 rounded-[3px]" style={{ background: toneVar }} />
        <h3 className="text-[13px] font-extrabold text-t1">{title}</h3>
        <span
          className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-extrabold text-bg"
          style={{ background: issue ? "var(--warn)" : "var(--pos)" }}
        >
          {issue ? "not legal" : `legal · ${filled}/6`}
        </span>
        <select
          defaultValue=""
          onChange={(e) => { if (e.target.value) onLoad(e.target.value); e.target.value = ""; }}
          className="ml-auto rounded-[9px] border border-line bg-raise px-2 py-1 text-xs text-t1"
        >
          <option value="">{side === "opponent" ? "Load prebuilt…" : "Load your team…"}</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {team.map((slug, i) => {
          const p = slug ? bySlug.get(slug) : undefined;
          return (
            <div key={i} className="relative">
              {p ? (
                <button
                  onClick={() => setEditing(editing === i ? null : i)}
                  className="flex w-full flex-col items-center gap-1 rounded-xl border border-line bg-raise p-2"
                >
                  <span className="grid h-11 w-14 place-items-center overflow-hidden">
                    <PokeIcon species={slug!} className="scale-[1.3]" />
                  </span>
                  <span className="truncate text-[11px] font-bold">{p.name}</span>
                  <span className="flex gap-1">
                    {p.types.map((t) => (
                      <span key={t} className="h-[4px] w-[22px] rounded-full" style={{ background: TYPE_HEX[t as PokemonType] }} />
                    ))}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setEditing(editing === i ? null : i)}
                  className="flex h-[84px] w-full flex-col items-center justify-center rounded-xl border border-dashed bg-bg text-t3 hover:border-accln"
                  style={{ borderColor: "var(--line)" }}
                >
                  <span className="text-xl text-t3">+</span>
                  <span className="text-[10px]">empty</span>
                </button>
              )}
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
    <div
      className="absolute left-0 top-full z-30 mt-1 w-[246px] max-w-[44vw] rounded-xl border border-line bg-panel p-2"
      style={{ boxShadow: "0 20px 44px rgba(0,0,0,0.5)" }}
    >
      <div className="mb-1 flex gap-1">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, type, ability…"
          className="w-full rounded-lg border border-accln bg-bg px-2 py-1 text-xs"
        />
        <button onClick={onClose} className="rounded-lg border border-line px-2 text-xs text-t2">✕</button>
      </div>
      <div className="max-h-[220px] overflow-y-auto">
        {results.map((p) => (
          <button
            key={p.slug}
            onClick={() => onPick(p.slug)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs hover:bg-soft"
          >
            <span className="inline-flex h-6 w-8 items-center justify-center overflow-hidden">
              <PokeIcon species={p.slug} />
            </span>
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            <span className="flex shrink-0 gap-0.5">
              {p.types.map((t) => <TypeBadge key={t} type={t as PokemonType} />)}
            </span>
          </button>
        ))}
      </div>
      <button onClick={onClear} className="mt-1 w-full rounded-lg border border-line py-0.5 text-xs text-t3 hover:border-neg">
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
  /** Whether this Pokémon has Mega Evolved (uses its Mega forme stats/typing). */
  mega: boolean;
  /** Ditto only: slug of the opposing active Pokémon it has Transformed into. */
  transformInto?: string | null;
  /** Dondozo only: boosted +2 to every stat by an allied Tatsugiri (Commander). */
  commander?: boolean;
  /** Zoroark only: slug of the teammate it is disguised as (Illusion, cosmetic). */
  illusionAs?: string | null;
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
  mega: false,
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

/** A committed action for one of your active spots this round. */
interface Order {
  actor: string; // your acting mon's display name
  move: string;
  target: string; // target mon's display name
}
interface LogLine {
  actor: "user" | "opp" | "neutral";
  text: string;
}
interface LogRound {
  round: number;
  lines: LogLine[];
}

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
  items,
  megaForms,
  userTeam,
  oppTeam,
  loadedSets,
  onBack,
}: {
  bySlug: Map<string, PokemonRef>;
  items: string[];
  megaForms: Record<string, MegaForme>;
  userTeam: string[];
  oppTeam: string[];
  loadedSets: Record<string, KnownSet>;
  onBack: () => void;
}) {
  const refBySlug = bySlug;
  /** Display name for a slug, falling back to the slug when not in the pool. */
  const nameOf = (s: string): string => refBySlug.get(s)?.name ?? s;
  // Abilities selectable in-match: every ability held by a Pokémon in this game
  // (covers Skill Swap / Trace / Role Play copying) plus move/ability results.
  const matchAbilities = useMemo(() => {
    const set = new Set<string>(ABILITY_CHANGE_RESULTS);
    for (const s of [...userTeam, ...oppTeam]) {
      for (const a of bySlug.get(s)?.abilities ?? []) set.add(a);
    }
    return [...set].sort();
  }, [userTeam, oppTeam, bySlug]);
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
  // This round's orders, one per your active spot. null = no order yet.
  const [orders, setOrders] = useState<[Order | null, Order | null]>([null, null]);
  // Committed rounds; each is a list of log lines. logIdx pages the view.
  const [log, setLog] = useState<LogRound[]>([]);
  const [logIdx, setLogIdx] = useState(0);

  // Stable side-aware signature, so a saved battle only resumes for the same
  // side assignments and slot order - not just the same twelve Pokémon.
  const teamSig = useMemo(
    () => `user:${userTeam.join("|")}::opponent:${oppTeam.join("|")}`,
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
          if (typeof s.ts === "number" && Date.now() - s.ts > BATTLE_TTL_MS) {
            localStorage.removeItem(BATTLE_KEY); // don't reopen an old battle
            return;
          }
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
        JSON.stringify({ ts: Date.now(), sig: teamSig, uTeam, oTeam, activeUser, activeOpp, mon, weather, terrain, trickRoom, gravity, uCond, oCond, round, background }),
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

  const asTuple = (t: readonly PokemonType[]) =>
    t.slice(0, 2) as [PokemonType] | [PokemonType, PokemonType];

  // Active battle forme for a mon: its Mega (if toggled), or - for Ditto - the
  // opposing active Pokémon it has Transformed into (copying stats except HP,
  // typing, ability, movepool, and sprite). Undefined = fights as its base self.
  const formeOf = (side: Side, slug: string): SlotForm["forme"] | undefined => {
    const s = monOf(side, slug);
    if (s.mega && megaForms[slug]) {
      const m = megaForms[slug];
      return { name: m.name, baseStats: m.baseStats, types: asTuple(m.types), ability: m.ability };
    }
    if (slug === "ditto" && s.transformInto) {
      const t = refBySlug.get(s.transformInto);
      const ditto = refBySlug.get("ditto");
      if (t) {
        return {
          name: t.name,
          // Transform copies every stat except HP, which stays Ditto's own.
          baseStats: { ...t.baseStats, hp: ditto?.baseStats.hp ?? t.baseStats.hp },
          types: asTuple(t.types),
          ability: t.abilities[0] ?? "",
          moves: t.moves,
          species: t.slug,
        };
      }
    }
    return undefined;
  };

  const toSlot = (side: Side, slug: string): SlotForm => {
    const s = monOf(side, slug);
    const mega = s.mega ? megaForms[slug] : undefined;
    // A consumed item no longer applies to damage/speed. A Mega holds its Stone,
    // which is not removable/consumable, so it overrides the item slot.
    // Commander: an allied Tatsugiri gives Dondozo +2 to every combat stage,
    // stacked on top of (not replacing) any manually-entered boosts.
    const stages = s.commander
      ? (Object.fromEntries(
          (Object.keys(s.stages) as (keyof StageStats)[]).map((k) => [
            k,
            Math.max(-6, Math.min(6, s.stages[k] + 2)),
          ]),
        ) as StageStats)
      : s.stages;
    return {
      ...emptySlot(slug),
      hpPct: s.hpPct,
      status: s.status,
      ability: s.ability,
      item: mega ? mega.item : s.itemUsed ? "None" : s.item,
      nature: s.nature,
      evs: s.evs,
      stages,
      forme: formeOf(side, slug),
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
      // Exclude the sibling (can't be in both spots) and fainted Pokémon - but
      // always keep whoever currently occupies this spot so it stays visible.
      .filter((s) => s !== sibling && (s === current || monOf(side, s).hpPct > 0))
      .map((s) => ({ slug: s, name: nameOf(s) }));
  };

  // In-battle form changes available on a given active card, by species.
  const specialFor = (side: Side, slug: string | null): SpecialForm => {
    if (!slug) return null;
    const team = side === "user" ? uTeam : oTeam;
    if (slug === "ditto") {
      const foes = (side === "user" ? activeOpp : activeUser).filter((x): x is string => !!x);
      return { kind: "ditto", options: foes.map((s) => ({ slug: s, name: nameOf(s) })) };
    }
    if (slug === "dondozo" && team.some((s) => s.startsWith("tatsugiri"))) return { kind: "commander" };
    if (slug === "zoroark" || slug === "zoroarkhisui") {
      return {
        kind: "zoroark",
        options: team.filter((s) => s !== slug).map((s) => ({ slug: s, name: nameOf(s) })),
      };
    }
    return null;
  };
  // Sprite/name shown on the card: Ditto's Transform target, or Zoroark's
  // Illusion disguise. (Mega display is handled inside ActiveCard.)
  const disguiseFor = (side: Side, slug: string | null): { species: string; name: string } | undefined => {
    if (!slug) return undefined;
    const s = monOf(side, slug);
    const target = slug === "ditto" && s.transformInto ? s.transformInto : s.illusionAs;
    if (!target) return undefined;
    const r = refBySlug.get(target);
    return r ? { species: r.slug, name: r.name } : undefined;
  };

  const userAlive = uTeam.filter((s) => monOf("user", s).hpPct > 0).length;
  const oppAlive = oTeam.filter((s) => monOf("opponent", s).hpPct > 0).length;
  const battleOver = userAlive === 0 || oppAlive === 0;

  const ordersSet = orders.filter(Boolean).length;
  const fieldBits = (): string[] => {
    const b: string[] = [];
    if (weather !== "none") b.push(weather);
    if (terrain !== "none") b.push(`${terrain} terrain`);
    if (trickRoom) b.push("Trick Room");
    if (gravity) b.push("Gravity");
    if (uCond.tailwind) b.push("your Tailwind");
    return b;
  };
  const commitRound = () => {
    const lines: LogLine[] = [];
    for (const o of orders) if (o) lines.push({ actor: "user", text: `${o.actor} used ${o.move} → ${o.target}` });
    const fb = fieldBits();
    if (fb.length) lines.push({ actor: "neutral", text: `Field: ${fb.join(", ")}` });
    if (lines.length === 0) lines.push({ actor: "neutral", text: "No orders recorded." });
    setLog((l) => {
      const next = [...l, { round, lines }];
      setLogIdx(next.length - 1);
      return next;
    });
    setRound((r) => r + 1);
    setOrders([null, null]);
  };
  const backRound = () => {
    if (round <= 1) return;
    setRound((r) => r - 1);
    setLog((l) => {
      const next = l.slice(0, -1);
      setLogIdx(Math.max(0, next.length - 1));
      return next;
    });
    setOrders([null, null]);
  };
  const setOrder = (i: 0 | 1, o: Order | null) =>
    setOrders((prev) => { const n = [...prev] as [Order | null, Order | null]; n[i] = o; return n; });

  // Move options for one of your active spots, from the built attacker.
  const movesForSpot = (i: 0 | 1): string[] =>
    built?.state?.user.active[i]?.moves.map((m) => m.name) ?? [];
  const oppNames = ([activeOpp[0], activeOpp[1]].filter(Boolean) as string[]).map(nameOf);

  const Chip = ({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) => (
    <button type="button" title={title} onClick={onClick}
      className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-4 ${on ? "bg-acc text-bg" : "bg-raise text-t2 hover:text-t1"}`}>
      {children}
    </button>
  );

  const SideCard = ({ tone, cond, setCond, side }: { tone: "pos" | "neg"; cond: SideCond; setCond: (c: SideCond) => void; side: Side }) => {
    const toneVar = tone === "pos" ? "var(--pos)" : "var(--neg)";
    const screens: [keyof SideCond, string][] = [["tailwind", "Tailwind"], ["reflect", "Reflect"], ["lightScreen", "Light Screen"], ["auroraVeil", "Aurora Veil"]];
    return (
      <div className="space-y-2 rounded-xl p-[11px] text-xs" style={{ border: `1px solid color-mix(in srgb, ${toneVar} 40%, transparent)`, background: `color-mix(in srgb, ${toneVar} 7%, var(--panel))` }}>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-extrabold" style={{ color: toneVar }}>{side === "user" ? "Your side" : "Opponent side"}</span>
          {hasHazards(cond) && <span className="text-[9px] font-bold text-warn">⚠ hazards up</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {screens.map(([k, lbl]) => (
            <Chip key={k} on={cond[k] as boolean} onClick={() => setCond({ ...cond, [k]: !(cond[k] as boolean) })}>{lbl}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip on={cond.stealthRock} onClick={() => setCond({ ...cond, stealthRock: !cond.stealthRock })}>Stealth Rock</Chip>
          <Chip on={cond.stickyWeb} onClick={() => setCond({ ...cond, stickyWeb: !cond.stickyWeb })}>Sticky Web</Chip>
        </div>
        <div className="grid items-center gap-1" style={{ gridTemplateColumns: "minmax(0,1fr) 78px" }}>
          <span className="text-[10px] text-t3">Spikes</span>
          <span className="grid" style={{ gridTemplateColumns: "repeat(3, 24px)" }}>
            {[1, 2, 3].map((n) => <Chip key={n} on={cond.spikes === n} onClick={() => setCond({ ...cond, spikes: cond.spikes === n ? 0 : n })}>{n}</Chip>)}
          </span>
          <span className="text-[10px] text-t3">Toxic Spikes</span>
          <span className="grid" style={{ gridTemplateColumns: "repeat(3, 24px)" }}>
            {[1, 2].map((n) => <Chip key={n} on={cond.toxicSpikes === n} onClick={() => setCond({ ...cond, toxicSpikes: cond.toxicSpikes === n ? 0 : n })}>{n}</Chip>)}
          </span>
        </div>
        <button onClick={() => allySwitch(side)} className="rounded border border-line px-2 py-0.5 text-[11px] text-t2 hover:border-accln">Ally Switch</button>
      </div>
    );
  };

  return (
    <div className="space-y-[14px]">
      {/* Round toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2.5 text-xs">
        <button onClick={onBack} className="font-bold text-acc hover:text-accs">← Team preview</button>
        <span className="rounded-full bg-raise px-2 py-0.5 font-mono uppercase tabular-nums text-t2">Round {round}</span>
        <span className="text-t3">{userAlive} vs {oppAlive} alive</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={swapSides} title="Swap which side is yours" className="rounded border border-line px-2 py-1 text-t2 hover:border-accln">⇄ Swap sides</button>
          <label className="flex items-center gap-1 text-t3">Stage
            <select value={background} onChange={(e) => setBackground(e.target.value)} className="rounded border border-line bg-raise px-1 py-0.5 text-t1">
              {BACKGROUNDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </label>
          <button onClick={backRound} disabled={round <= 1} className="rounded border border-line px-2 py-1 text-t2 hover:border-accln disabled:opacity-40">← Back a round</button>
          {battleOver ? (
            <button onClick={() => { try { localStorage.removeItem(BATTLE_KEY); } catch { /* ignore */ } onBack(); }}
              className="rounded-lg bg-acc px-3 py-1.5 font-extrabold text-bg hover:bg-accs">New battle</button>
          ) : (
            <button onClick={commitRound} className="rounded-lg bg-acc px-3 py-1.5 font-extrabold text-bg hover:bg-accs" style={{ boxShadow: "0 0 0 3px var(--accbg)" }}>Next round →</button>
          )}
        </div>
      </div>

      {/* Best play this round */}
      <div className="rounded-[14px] border border-accln bg-accbg p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="rounded bg-acc px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-bg">Best play this round</span>
          <span className="text-[11px] text-t3">Balanced profile</span>
        </div>
        {!built?.state ? (
          <p className="text-sm text-neg">Assign a Pokémon to all four battle spots.</p>
        ) : (
          <Recommendations recommendations={recommendations} profileLabel="Balanced" />
        )}
      </div>

      {/* Arena + side conditions */}
      <div className="grid gap-3 lg:grid-cols-[minmax(166px,0.55fr)_minmax(0,2fr)_minmax(166px,0.55fr)]">
        <SideCard tone="pos" cond={uCond} setCond={setUCond} side="user" />

        <div className="relative overflow-hidden rounded-2xl border border-line p-2.5" style={bgStyle(background)}>
          {/* Field card */}
          <div className="mx-auto mb-2 w-[min(340px,100%)] space-y-1.5 rounded-xl border p-2 backdrop-blur"
            style={{ borderColor: "rgba(255,255,255,0.18)", background: "rgba(20,24,30,0.82)" }}>
            <div className="grid items-baseline gap-1" style={{ gridTemplateColumns: "48px minmax(0,1fr)" }}>
              <span className="text-[9px] font-extrabold uppercase text-slate-300">Weather</span>
              <span className="flex flex-wrap gap-1">
                {WEATHERS.filter((w) => w !== "none").map((w) => <Chip key={w} on={weather === w} onClick={() => setWeather(weather === w ? "none" : w)}>{w}</Chip>)}
              </span>
            </div>
            <div className="grid items-baseline gap-1" style={{ gridTemplateColumns: "48px minmax(0,1fr)" }}>
              <span className="text-[9px] font-extrabold uppercase text-slate-300">Terrain</span>
              <span className="flex flex-wrap gap-1">
                {TERRAINS.filter((t) => t !== "none").map((t) => <Chip key={t} on={terrain === t} onClick={() => setTerrain(terrain === t ? "none" : t)}>{t}</Chip>)}
              </span>
            </div>
            <div className="grid items-baseline gap-1" style={{ gridTemplateColumns: "48px minmax(0,1fr)" }}>
              <span className="text-[9px] font-extrabold uppercase text-slate-300">Rooms</span>
              <span className="flex flex-wrap gap-1">
                <Chip on={trickRoom} onClick={() => setTrickRoom(!trickRoom)}>Trick Room</Chip>
                <Chip on={gravity} onClick={() => setGravity(!gravity)}>Gravity</Chip>
              </span>
            </div>
          </div>

          {/* Active editor cards: opponent right, you left */}
          <div className="flex items-end justify-between gap-2">
            <div className="flex gap-2">
              {[0, 1].map((i) => {
                const slug = activeUser[i as 0 | 1];
                return (
                  <ActiveCard key={i} label="You" slug={slug} state={monOf("user", slug)}
                    options={optionsFor("user", uTeam, activeUser, i as 0 | 1)} abilities={matchAbilities}
                    defaultAbility={abilitiesFor(slug)[0] ?? ""} items={items} mega={slug ? megaForms[slug] : undefined}
                    special={specialFor("user", slug)} disguise={disguiseFor("user", slug)}
                    formeAbility={slug ? formeOf("user", slug)?.ability : undefined}
                    onSelect={(s) => { setActive("user", i as 0 | 1, s); if (s && s !== slug) patchMon("user", s, { stages: NEUTRAL_STAGES }); }}
                    onPatch={(p) => patchMon("user", slug, p)} />
                );
              })}
            </div>
            <div className="flex gap-2">
              {[0, 1].map((i) => {
                const slug = activeOpp[i as 0 | 1];
                return (
                  <ActiveCard key={i} label="Opp" foe slug={slug} state={monOf("opponent", slug)}
                    options={optionsFor("opponent", oTeam, activeOpp, i as 0 | 1)} abilities={matchAbilities}
                    defaultAbility={abilitiesFor(slug)[0] ?? ""} items={items} mega={slug ? megaForms[slug] : undefined}
                    special={specialFor("opponent", slug)} disguise={disguiseFor("opponent", slug)}
                    formeAbility={slug ? formeOf("opponent", slug)?.ability : undefined}
                    onSelect={(s) => { setActive("opponent", i as 0 | 1, s); if (s && s !== slug) patchMon("opponent", s, { stages: NEUTRAL_STAGES }); }}
                    onPatch={(p) => patchMon("opponent", slug, p)} />
                );
              })}
            </div>
          </div>
        </div>

        <SideCard tone="neg" cond={oCond} setCond={setOCond} side="opponent" />
      </div>

      {/* Orders + battle log */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Your orders */}
        <div className="rounded-xl border border-accln bg-panel p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase text-t2">Your orders · round {round}</span>
            <span className={`text-[11px] font-bold ${ordersSet === 2 ? "text-pos" : "text-warn"}`}>{ordersSet === 2 ? "both orders set" : `${ordersSet} of 2 set`}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[0, 1].map((i) => {
              const slug = activeUser[i as 0 | 1];
              const moves = movesForSpot(i as 0 | 1);
              const o = orders[i as 0 | 1];
              return (
                <div key={i} className="rounded-lg border p-2 text-xs" style={{ borderColor: o ? "var(--accln)" : "var(--line)" }}>
                  <div className="mb-1 flex items-center gap-1">
                    {slug && <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden"><PokeIcon species={slug} /></span>}
                    <span className="truncate text-[11px] font-bold text-t1">{slug ? nameOf(slug) : "-"}</span>
                    {o && <button onClick={() => setOrder(i as 0 | 1, null)} className="ml-auto text-t3 hover:text-neg">✕</button>}
                  </div>
                  <select value={o?.move ?? ""} disabled={!slug || moves.length === 0}
                    onChange={(e) => { const mv = e.target.value; setOrder(i as 0 | 1, mv ? { actor: nameOf(slug!), move: mv, target: oppNames[0] ?? "target" } : null); }}
                    className="w-full rounded border border-line bg-raise px-1 py-0.5 text-[11px]">
                    <option value="">No order yet</option>
                    {moves.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {o && oppNames.length > 1 && (
                    <select value={o.target} onChange={(e) => setOrder(i as 0 | 1, { ...o, target: e.target.value })}
                      className="mt-1 w-full rounded border border-line bg-raise px-1 py-0.5 text-[10px] text-t3">
                      {oppNames.map((n) => <option key={n} value={n}>→ {n}</option>)}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-t3">{fieldBits().length ? `Recorded field: ${fieldBits().join(", ")}.` : "No field effects recorded."}</p>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={backRound} disabled={round <= 1} className="rounded-lg border border-line px-2 py-1 text-[11px] text-t2 hover:border-accln disabled:opacity-40">← Back a round</button>
            <button onClick={commitRound} className={`ml-auto rounded-lg px-3 py-1.5 text-[13px] font-extrabold text-bg ${ordersSet === 2 ? "bg-acc hover:bg-accs" : "bg-acc/60"}`}>
              {ordersSet === 2 ? `Commit round ${round} & continue →` : `Commit round ${round} anyway →`}
            </button>
          </div>
        </div>

        {/* Battle log */}
        <div className="rounded-xl border border-line bg-panel p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase text-t2">Battle log</span>
            <span className="flex items-center gap-2 text-[11px]">
              <button onClick={() => setLogIdx((i) => Math.max(0, i - 1))} disabled={logIdx <= 0} className="text-t2 disabled:text-t3/50">←</button>
              <span className="font-mono tabular-nums text-t3">{log.length ? logIdx + 1 : 0} / {log.length}</span>
              <button onClick={() => setLogIdx((i) => Math.min(log.length - 1, i + 1))} disabled={logIdx >= log.length - 1} className="text-t2 disabled:text-t3/50">→</button>
            </span>
          </div>
          {log.length === 0 ? (
            <p className="text-xs text-t3">No rounds committed yet.</p>
          ) : (
            <div className="max-h-[264px] overflow-y-auto border-l-2 border-accln pl-2">
              <p className="font-mono text-[9px] font-bold uppercase text-t3">Round {log[logIdx]?.round}</p>
              {log[logIdx]?.lines.map((ln, j) => (
                <p key={j} className="text-[12px]" style={{ color: ln.actor === "user" ? "var(--pos)" : ln.actor === "opp" ? "var(--neg)" : "var(--t2)" }}>{ln.text}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Remaining Pokémon per side */}
      <div className="grid grid-cols-[1fr_1fr] items-start gap-3 rounded-xl border border-line bg-panel p-3">
        <div>
          <p className="mb-1 text-[10px] font-extrabold uppercase text-pos">Your team</p>
          <div className="flex flex-wrap gap-1.5">
            {uTeam.map((s) => (
              <MonChip key={s} name={nameOf(s)} slug={s} state={monOf("user", s)} refData={refBySlug.get(s)} mega={megaForms[s]} />
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="mb-1 text-[10px] font-extrabold uppercase text-neg">Opponent&apos;s team</p>
          <div className="flex flex-wrap justify-end gap-1.5">
            {oTeam.map((s) => (
              <MonChip key={s} name={nameOf(s)} slug={s} state={monOf("opponent", s)} refData={refBySlug.get(s)} mega={megaForms[s]} />
            ))}
          </div>
        </div>
      </div>

      {/* Detail panels: your active (top) + opponent active (bottom) */}
      {built?.state && (
        <div className="flex items-center gap-3 text-[10px] font-extrabold uppercase">
          <span className="text-pos">Your active</span>
          <span className="text-neg">Opponent active</span>
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
            const forme = formeOf(spec.foe ? "opponent" : "user", spec.slug);
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
                name={forme ? forme.name : ref.name}
                types={forme ? forme.types : ref.types}
                baseStats={forme ? forme.baseStats : ref.baseStats}
                attacker={attacker}
                targets={targets}
                abilities={matchAbilities}
                defaultAbility={abilitiesFor(spec.slug)[0] ?? ""}
                lockedAbility={forme?.ability}
                items={items}
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

      {battleOver && (
        <p className="rounded-lg border border-warn/40 bg-panel p-3 text-sm font-bold text-warn">
          🏆 {userAlive === 0 && oppAlive === 0
            ? "Both sides fainted - draw."
            : userAlive === 0
              ? "Opponent wins - your team fainted."
              : "You win - opponent team fainted."}{" "}
          Use “New battle” above to restart.
        </p>
      )}
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

/** Team-overview chip: bigger icon + HP/status warning badges + coloured status.
 *  Hovering shows a small overview (types, stats, ability, item). */
function MonChip({
  name,
  slug,
  state,
  refData,
  mega,
}: {
  name: string;
  slug: string;
  state: MonState;
  refData?: PokemonRef;
  mega?: MegaForme;
}) {
  const isMega = !!mega && state.mega;
  const fainted = state.hpPct <= 0;
  const warn = !fainted && state.hpPct < 20 ? "red" : !fainted && state.hpPct <= 50 ? "yellow" : null;
  const b = isMega ? mega!.baseStats : refData?.baseStats;
  const statLine = b
    ? `\nBase: HP ${b.hp} / Atk ${b.atk} / Def ${b.def} / SpA ${b.spa} / SpD ${b.spd} / Spe ${b.spe}`
    : "";
  const typeArr = isMega ? mega!.types : refData?.types;
  const typeLine = typeArr?.length ? `\n${typeArr.join(" / ")}` : "";
  const title =
    `${isMega ? mega!.name : name} - ${state.hpPct}% HP` +
    (state.status !== "none" ? ` · ${state.status}` : "") +
    (isMega ? ` · ${mega!.ability}` : state.ability ? ` · ${state.ability}` : "") +
    (isMega ? ` · ${mega!.item}` : state.item && state.item !== "None" ? ` · ${state.item}` : "") +
    typeLine +
    statLine;
  return (
    <span
      className={`relative inline-flex h-12 w-12 items-center justify-center overflow-hidden ${fainted ? "opacity-30 grayscale" : ""}`}
      title={title}
    >
      <PokeIcon species={isMega ? mega!.name : slug} className="scale-[1.35]" />
      {isMega && (
        <span className="absolute left-0 top-0 rounded bg-fuchsia-500 px-0.5 text-[7px] font-bold text-black">M</span>
      )}
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
  items,
  mega,
  special,
  disguise,
  formeAbility,
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
  items: string[];
  /** This species' Mega/Primal forme, if any - enables the Mega button. */
  mega?: MegaForme;
  /** Species-specific in-battle form change (Ditto / Dondozo / Zoroark). */
  special?: SpecialForm;
  /** Sprite/name override from Transform or Illusion. */
  disguise?: { species: string; name: string };
  /** Ability fixed by the active forme (Mega / Transform); locks the selector. */
  formeAbility?: string;
  onSelect: (slug: string | null) => void;
  onPatch: (p: Partial<MonState>) => void;
}) {
  const isMega = !!mega && state.mega;
  // A Mega shows its forme icon/name, holds its (non-removable) Stone, and uses
  // the forme's fixed ability. Transform/Illusion swap the sprite (and, for
  // Transform, everything else via the built combatant).
  const iconSpecies = isMega ? mega!.name : disguise?.species ?? slug;
  const displayName = isMega ? mega!.name : disguise?.name ?? slug;
  // A forme (Mega or Ditto's Transform) fixes the ability the built combatant
  // uses, so the selector must show that ability read-only rather than a stale,
  // ignored value.
  const abilityLocked = !!formeAbility;
  const abilityValue = formeAbility ?? (state.ability || defaultAbility);
  const itemValue = isMega ? mega!.item : state.item;
  const abilityOpts =
    formeAbility && !abilities.includes(formeAbility) ? [formeAbility, ...abilities] : abilities;
  const hoverInfo = slug
    ? `${displayName} - ${state.hpPct}% HP` +
      (state.status !== "none" ? ` · ${state.status}` : "") +
      (abilityValue ? ` · ${abilityValue}` : "") +
      (itemValue && itemValue !== "None" ? ` · ${itemValue}` : "")
    : undefined;
  const toggleMega = () =>
    onPatch(
      state.mega
        ? { mega: false }
        : { mega: true, item: mega!.item, itemUsed: false },
    );
  return (
    <div
      title={hoverInfo}
      className={`w-40 rounded-lg border p-2 text-xs backdrop-blur ${foe ? "border-rose-800/60 bg-slate-900/70" : "border-emerald-800/60 bg-slate-900/70"}`}
    >
      <div className="mb-1 flex items-center gap-1">
        {slug && (
          <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden">
            <PokeIcon species={iconSpecies!} className="scale-[1.3]" />
          </span>
        )}
        <span className="text-[10px] uppercase text-slate-500">{label}</span>
        {slug && mega && (
          <button
            type="button"
            onClick={toggleMega}
            title={isMega ? `Revert ${mega.name}` : `Mega Evolve (${mega.name}, ${mega.item})`}
            className={`ml-auto rounded px-1 py-0.5 text-[9px] font-bold ${
              isMega ? "bg-fuchsia-500 text-black" : "border border-fuchsia-500/60 text-fuchsia-300 hover:bg-fuchsia-500/20"
            }`}
          >
            M
          </button>
        )}
      </div>
      <select
        value={slug ?? ""}
        onChange={(e) => onSelect(e.target.value || null)}
        className="mb-1 w-full rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs"
      >
        <option value="">-</option>
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
          value={abilityValue}
          disabled={!slug || abilityLocked}
          onChange={(e) => onPatch({ ability: e.target.value })}
          title={abilityLocked ? "Forme ability (fixed)" : "Set the current ability (Skill Swap, Simple Beam, …)"}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs disabled:opacity-70"
        >
          {abilityOpts.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      )}
      <select
        value={itemValue}
        disabled={!slug || isMega}
        onChange={(e) => onPatch({ item: e.target.value })}
        title={isMega ? "Mega Stone (cannot be removed)" : undefined}
        className={`mt-1 w-full rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs disabled:opacity-70 ${state.itemUsed && !isMega ? "text-slate-500 line-through" : ""}`}
      >
        {itemOptions(itemValue, items).map((it) => <option key={it} value={it}>{it}</option>)}
      </select>
      {slug && !isMega && state.item !== "None" && (
        <label className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
          <input
            type="checkbox"
            checked={state.itemUsed}
            onChange={(e) => onPatch({ itemUsed: e.target.checked })}
          />
          item used (consumed)
        </label>
      )}
      {slug && special?.kind === "ditto" && (
        <select
          value={state.transformInto ?? ""}
          onChange={(e) => onPatch({ transformInto: e.target.value || null })}
          title="Transform: copy an opposing active Pokémon's stats, typing, moves & ability"
          className="mt-1 w-full rounded border border-sky-700 bg-slate-900 px-1 py-0.5 text-[10px] text-sky-200"
        >
          <option value="">Transform into…</option>
          {/* Keep the current copy selectable even after it has switched out -
              Transform persists once used. */}
          {(state.transformInto && !special.options.some((o) => o.slug === state.transformInto)
            ? [{ slug: state.transformInto, name: disguise?.name ?? state.transformInto }, ...special.options]
            : special.options
          ).map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
        </select>
      )}
      {slug && special?.kind === "commander" && (
        <label className="mt-1 flex items-center gap-1 text-[10px] text-sky-200" title="Allied Tatsugiri boosts Dondozo +2 to every stat">
          <input
            type="checkbox"
            checked={!!state.commander}
            onChange={(e) => onPatch({ commander: e.target.checked })}
          />
          Commander (+2 all)
        </label>
      )}
      {slug && special?.kind === "zoroark" && (
        <select
          value={state.illusionAs ?? ""}
          onChange={(e) => onPatch({ illusionAs: e.target.value || null })}
          title="Illusion: appear as a teammate (cosmetic - stats stay Zoroark's)"
          className="mt-1 w-full rounded border border-fuchsia-700 bg-slate-900 px-1 py-0.5 text-[10px] text-fuchsia-200"
        >
          <option value="">Illusion (disguise)…</option>
          {special.options.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
        </select>
      )}
    </div>
  );
}
