"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeLeads } from "@/domain/choicedex/leads";
import { recommend, type Recommendation } from "@/domain/choicedex/recommend";
import { calculateDamage } from "@/domain/mechanics/damage";
import { assumptionsFor } from "@/domain/mechanics/assumptions";
import { natureByName } from "@/data/fixtures/natures";
import {
  DEFAULT_FIELD,
  NEUTRAL_STAGES,
  type Combatant,
  type FieldState,
  type SideConditions,
  type StageStats,
  type StatusCondition,
  type Terrain,
  type Weather,
} from "@/domain/types/battle";
import { STAT_KEYS, type MoveFixture, type PokemonType, type StatKey } from "@/domain/types/pokemon";
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
import { Sprite } from "./design/Sprite";
import {
  ACC, BG, NEG, POS, RAISE, T2, WARN,
  STAGES, ROOM_FX, WEATHER_FX, TERRAIN_FX,
  STATUS_COLOR, STATUS_SHORT, STATUS_GLYPH, STATUS_WASH,
  TYPE_HEX, hpColor, typesFor,
} from "./design/tokens";

// ---------------------------------------------------------------------------
// Shared types + public props
// ---------------------------------------------------------------------------

export interface KnownSet {
  evs: Partial<Record<StatKey, number>>;
  nature: string;
  item: string;
  ability: string;
  moves?: string[];
}
export interface SavedTeam {
  id: string;
  name: string;
  members: string[];
  sets?: Record<string, KnownSet>;
}

type Side = "user" | "opponent";

interface MonState {
  hpPct: number;
  status: StatusCondition;
  ability: string;
  item: string;
  itemUsed: boolean;
  nature: string;
  evs: Partial<Record<StatKey, number>>;
  stages: StageStats;
  crit: boolean;
  knownMoves: string[];
  /** Opponent-side: which candidate moves are confirmed in their set. */
  moveState?: Record<string, "set">;
  mega: boolean;
  transformInto?: string | null;
  commander?: boolean;
  illusionAs?: string | null;
}
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
interface LogLine { side: "user" | "opp" | "neutral"; text: string; }
interface LogRound { round: number; lines: LogLine[]; }
interface Order { move: string; target: 0 | 1; slug: string; }

const STATUSES: StatusCondition[] = ["burn", "paralysis", "poison", "toxic", "sleep", "freeze"];
const ABILITY_CHANGE_RESULTS = ["(none)", "Simple", "Insomnia", "Truant", "Mummy", "Lingering Aroma", "Wandering Spirit"];
const BRING_LIMIT = 4;
const TEAM_MIN = 2;

const emptyMon = (): MonState => ({
  hpPct: 100, status: "none", ability: "", item: "None", itemUsed: false,
  nature: "Serious", evs: {}, stages: { ...NEUTRAL_STAGES }, crit: false,
  knownMoves: [], mega: false,
});
const emptyCond = (): SideCond => ({
  tailwind: false, reflect: false, lightScreen: false, auroraVeil: false,
  stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false,
});
const emptyTeam = (): (string | null)[] => [null, null, null, null, null, null];

function monFromSet(set: KnownSet | undefined): MonState {
  const base = emptyMon();
  if (!set) return base;
  return { ...base, evs: set.evs ?? {}, nature: set.nature || base.nature, item: set.item || base.item, ability: set.ability || base.ability };
}

// ---------------------------------------------------------------------------
// Tiny style helpers (kept 1:1 with the design's inline literals)
// ---------------------------------------------------------------------------

const pill = (on: boolean) => ({ bg: on ? ACC : RAISE, fg: on ? BG : T2, border: on ? ACC : "oklch(32% 0.01 240)" });

const TOUR = [
  { title: "Welcome to ChoiceDex", body: "ChoiceDex is a live doubles assistant: set up both teams, start the battle, and it ranks your best play each turn. This quick tour explains every part - you can skip it anytime." },
  { title: "Build both teams", body: "Fill each side's slots with Pokémon by clicking an empty tile to search and pick; click a filled tile to change or clear it. Each side needs 2-6 Pokémon with no duplicate species." },
  { title: "Load a saved team", body: "Use the “Load…” dropdown on a team sheet to drop in one of your saved teams. It also prefills that team's EVs, nature, item and moves so the readouts are accurate." },
  { title: "Pick your lead", body: "Under the teams, ChoiceDex ranks the strongest opening pairs for your side against the opponent, with the best and worst matchups noted." },
  { title: "The arena", body: "Both sides stand on the field with HP plates showing typing and status. Click a Pokémon or its plate to bring that card into focus below." },
  { title: "Both cards, side by side", body: "Under the arena your active Pokémon sits on the left and the opponent's on the right, each with its own moves, spread and boosts. Use the small icons top-right of a card to switch to its partner." },
  { title: "Moves", body: "Each move shows its type, base power, accuracy, damage range and KO odds. Click one of your moves to order it this round; click an opponent move to mark it confirmed." },
  { title: "Your orders & the log", body: "“Your orders” shows what you have chosen before you commit. Press the round button and it is written into the battle log, which keeps the full history of the match." },
  { title: "Field & side conditions", body: "On the right, set weather, terrain, Trick Room and Gravity, plus each side's screens and hazards. Weather and terrain also show on the field itself." },
  { title: "Advanced tools", body: "The Advanced tools section adds opponent stat/speed inference, a batch simulator, and battle analysis. That's the whole tool - enjoy!" },
];

const SESSION_KEY = "choicedex.session.v3";
const BATTLE_KEY = "choicedex.battle.v3";
const BATTLE_TTL_MS = 12 * 60 * 60 * 1000;

// ===========================================================================
// Root: phase switch + setup screen
// ===========================================================================

export function ChoiceDexApp({
  pokemon,
  teams,
  items = [],
  megaForms = {},
  usage = {},
  advancedTools,
}: {
  pokemon: PokemonRef[];
  teams: SavedTeam[];
  items?: string[];
  megaForms?: Record<string, MegaForme>;
  usage?: Record<string, number>;
  advancedTools?: React.ReactNode;
}) {
  const bySlug = useMemo(() => bySlugMap(pokemon), [pokemon]);
  const [phase, setPhase] = useState<"preview" | "battle">("preview");
  const [userTeam, setUserTeam] = useState<(string | null)[]>(emptyTeam());
  const [oppTeam, setOppTeam] = useState<(string | null)[]>(emptyTeam());
  const [loadedSets, setLoadedSets] = useState<Record<string, KnownSet>>({});
  const [showTips, setShowTips] = useState(true);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [editing, setEditing] = useState<string | null>(null); // `${side}:${idx}`
  const [pickQuery, setPickQuery] = useState("");

  const sessionFirst = useRef(true);
  useEffect(() => {
    if (sessionFirst.current) {
      sessionFirst.current = false;
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          const fresh = typeof s.ts === "number" && Date.now() - s.ts < BATTLE_TTL_MS;
          const speciesOk = [...(s.userTeam ?? []), ...(s.oppTeam ?? [])].filter(Boolean).every((slug: string) => bySlug.has(slug));
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
      } catch { /* ignore */ }
      return;
    }
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now(), phase, userTeam, oppTeam, loadedSets }));
    } catch { /* ignore */ }
  }, [phase, userTeam, oppTeam, loadedSets, bySlug]);

  const sideIssue = (team: (string | null)[]): string | null => {
    const filled = team.filter((s): s is string => !!s);
    if (filled.length < TEAM_MIN) return `add at least ${TEAM_MIN} Pokémon`;
    if (filled.length > 6) return "keep to at most 6 Pokémon";
    if (new Set(filled).size !== filled.length) return "no duplicate species (Species Clause)";
    if (!filled.every((s) => bySlug.has(s))) return "contains a Pokémon outside the pool";
    return null;
  };
  const uIssue = sideIssue(userTeam);
  const oIssue = sideIssue(oppTeam);
  const canStart = !uIssue && !oIssue;
  const startMsg = uIssue ? `Your team — ${uIssue}.` : oIssue ? `Opponent team — ${oIssue}.` : "";
  const nameOf = (slug: string) => bySlug.get(slug)?.name ?? slug;

  const setSlot = (side: Side, idx: number, slug: string | null) =>
    (side === "user" ? setUserTeam : setOppTeam)((t) => t.map((s, i) => (i === idx ? slug : s)));
  const loadTeam = (side: Side, teamId: string) => {
    const t = teams.find((x) => x.id === teamId);
    if (!t) return;
    (side === "user" ? setUserTeam : setOppTeam)(emptyTeam().map((_, i) => t.members[i] ?? null));
    if (t.sets) setLoadedSets((prev) => {
      const next = { ...prev };
      for (const [slug, set] of Object.entries(t.sets!)) next[`${side}:${slug}`] = set;
      return next;
    });
  };

  const leads = useMemo(() => {
    const toC = (team: (string | null)[]) =>
      team.filter((s): s is string => !!s).map((s) => bySlug.get(s)).filter(Boolean)
        .map((ref) => combatantFromRef(ref!, emptySlot(ref!.slug)));
    const u = toC(userTeam), o = toC(oppTeam);
    if (u.length < 2 || o.length < 2) return [];
    return analyzeLeads({ userCandidates: u, opponentCandidates: o, field: DEFAULT_FIELD }).slice(0, 6);
  }, [userTeam, oppTeam, bySlug]);

  if (phase === "battle") {
    return (
      <BattleView
        pokemon={pokemon} bySlug={bySlug} items={items} megaForms={megaForms}
        userTeam={userTeam.filter((s): s is string => !!s)}
        oppTeam={oppTeam.filter((s): s is string => !!s)}
        loadedSets={loadedSets} onBack={() => setPhase("preview")}
        advancedTools={advancedTools}
      />
    );
  }

  const teamSheets: {
    side: Side; title: string; dot: string; border: string; loadLabel: string;
    badgeText: string; badgeBg: string; team: (string | null)[];
  }[] = [
    { side: "user", title: "Your team", dot: POS, border: "oklch(72% 0.13 150 / 0.35)", loadLabel: "Load your team…",
      badgeText: uIssue || "Battle ready", badgeBg: uIssue ? WARN : POS, team: userTeam },
    { side: "opponent", title: "Opponent team", dot: NEG, border: "oklch(68% 0.16 25 / 0.35)", loadLabel: "Load prebuilt…",
      badgeText: oIssue || "Battle ready", badgeBg: oIssue ? WARN : POS, team: oppTeam },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, fontSize: 13, color: "oklch(94% 0.004 240)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.02em" }}>ChoiceDex</h1>
          <p style={{ maxWidth: 620, fontSize: 13, color: "oklch(72% 0.01 240)", lineHeight: 1.55, margin: 0 }}>
            Set up both teams, start the battle, and get the best options each round as you enter what happened. All calculations are provisional and unverified for Pokémon Champions.
          </p>
        </div>
        <button onClick={() => { setTourOpen(true); setTourStep(0); }} style={{ borderRadius: 9, border: "1px solid oklch(30% 0.01 240)", background: "oklch(20% 0.008 240)", color: "oklch(72% 0.01 240)", padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Take the tour</button>
      </div>

      {showTips && (
        <div style={{ borderRadius: 12, border: "1px solid oklch(30% 0.01 240)", background: "oklch(20% 0.008 240)", padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <p style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.55, color: "oklch(72% 0.01 240)" }}>
            <span style={{ fontWeight: 800, color: "oklch(90% 0.004 240)" }}>Three steps.</span> Fill 2–6 slots per side, press Start battle, then each round pick your two actions, enter what happened, and read the top recommendation.
          </p>
          <button onClick={() => setShowTips(false)} style={{ flexShrink: 0, borderRadius: 7, border: "1px solid oklch(30% 0.01 240)", background: "none", color: "oklch(66% 0.012 240)", padding: "3px 9px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Got it ✕</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(132px,0.42fr) minmax(0,1fr)", gap: 12, alignItems: "stretch" }}>
        <TeamSheet
          sheet={teamSheets[0]!} pokemon={pokemon} teams={teams} usage={usage}
          editing={editing} setEditing={setEditing} pickQuery={pickQuery} setPickQuery={setPickQuery}
          onLoad={(id) => loadTeam("user", id)} onSet={(i, s) => setSlot("user", i, s)}
        />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center" }}>
          <button
            onClick={() => canStart && setPhase("battle")}
            style={{ borderRadius: 12, background: canStart ? ACC : "oklch(45% 0.02 240)", color: "oklch(16% 0.008 240)", fontWeight: 800, padding: "14px 18px", border: "none", fontSize: 14, cursor: canStart ? "pointer" : "default", opacity: canStart ? 1 : 0.5, width: "100%" }}
          >Start battle</button>
          {!canStart && <p style={{ margin: 0, fontSize: 11, lineHeight: 1.4, color: "oklch(68% 0.16 25)" }}>{startMsg}</p>}
          {canStart && <p style={{ margin: 0, fontSize: 11, lineHeight: 1.4, color: "oklch(56% 0.012 240)" }}>Both sides legal — {userTeam.filter(Boolean).length} vs {oppTeam.filter(Boolean).length}.</p>}
        </div>
        <TeamSheet
          sheet={teamSheets[1]!} pokemon={pokemon} teams={teams} usage={usage}
          editing={editing} setEditing={setEditing} pickQuery={pickQuery} setPickQuery={setPickQuery}
          onLoad={(id) => loadTeam("opponent", id)} onSet={(i, s) => setSlot("opponent", i, s)}
        />
      </div>

      {/* Pick your lead */}
      <section style={{ borderRadius: 14, border: "1px solid oklch(30% 0.01 240)", background: "oklch(20% 0.008 240)", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>Pick your lead</h3>
          <span style={{ fontSize: 11, color: "oklch(54% 0.012 240)" }}>ranked against their six</span>
        </div>
        {leads.length === 0 ? (
          <p style={{ fontSize: 13, color: "oklch(56% 0.012 240)", margin: 0 }}>Add at least 2 Pokémon to each team to rank opening pairs.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 9 }}>
            {leads.map((l, i) => {
              const first = i === 0;
              return (
                <div key={i} style={{ borderRadius: 12, border: `1px solid ${first ? "oklch(72% 0.1 190 / 0.4)" : "oklch(30% 0.01 240)"}`, background: first ? "oklch(72% 0.1 190 / 0.08)" : RAISE, padding: 11, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ borderRadius: 6, background: first ? ACC : "oklch(45% 0.03 240)", color: "oklch(16% 0.008 240)", fontWeight: 800, fontSize: 10, padding: "2px 6px" }}>#{i + 1}</span>
                    <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: first ? "oklch(82% 0.1 190)" : "oklch(64% 0.012 240)" }}>{l.score.toFixed(3)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Sprite species={l.lead[0]} w={48} h={36} scale={1.2} />
                    <Sprite species={l.lead[1]} w={48} h={36} scale={1.2} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.25 }}>{nameOf(l.lead[0])} + {nameOf(l.lead[1])}</span>
                  <span style={{ height: 4, borderRadius: 2, background: "oklch(30% 0.01 240)", overflow: "hidden", display: "block" }}>
                    <span style={{ display: "block", height: "100%", width: `${Math.round(l.score * 100)}%`, background: first ? ACC : "oklch(50% 0.04 240)" }} />
                  </span>
                  <span style={{ fontSize: 10, color: "oklch(56% 0.012 240)", lineHeight: 1.4 }}>best vs {nameOf(l.bestAgainst)}<br />worst vs {nameOf(l.worstAgainst)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {advancedTools}

      {tourOpen && (
        <TourModal step={tourStep} onStep={setTourStep} onClose={() => setTourOpen(false)} />
      )}
    </div>
  );
}

// ===========================================================================
// Setup: team sheet + slot picker
// ===========================================================================

function TeamSheet({
  sheet, pokemon, teams, usage, editing, setEditing, pickQuery, setPickQuery, onLoad, onSet,
}: {
  sheet: { side: Side; title: string; dot: string; border: string; loadLabel: string; badgeText: string; badgeBg: string; team: (string | null)[] };
  pokemon: PokemonRef[];
  teams: SavedTeam[];
  usage: Record<string, number>;
  editing: string | null;
  setEditing: (v: string | null) => void;
  pickQuery: string;
  setPickQuery: (v: string) => void;
  onLoad: (id: string) => void;
  onSet: (idx: number, slug: string | null) => void;
}) {
  const bySlug = useMemo(() => bySlugMap(pokemon), [pokemon]);
  return (
    <section style={{ borderRadius: 14, border: `1px solid ${sheet.border}`, background: "oklch(20% 0.008 240)", padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11, flexWrap: "wrap" }}>
        <span style={{ width: 9, height: 9, borderRadius: 3, background: sheet.dot }} />
        <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.01em", margin: 0 }}>{sheet.title}</h3>
        <span style={{ borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", background: sheet.badgeBg, color: "oklch(16% 0.008 240)" }}>{sheet.badgeText}</span>
        <select
          defaultValue=""
          onChange={(e) => { if (e.target.value) onLoad(e.target.value); e.currentTarget.value = ""; }}
          style={{ marginLeft: "auto", borderRadius: 9, height: 32, border: "1px solid oklch(30% 0.01 240)", background: "oklch(24% 0.008 240)", color: "oklch(88% 0.01 240)", padding: "0 10px", fontSize: 12 }}
        >
          <option value="">{sheet.loadLabel}</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
        {sheet.team.map((slug, i) => {
          const p = slug ? bySlug.get(slug) : undefined;
          const key = `${sheet.side}:${i}`;
          const isEditing = editing === key;
          return (
            <div key={i} style={{ position: "relative" }}>
              <button
                onClick={() => { setEditing(isEditing ? null : key); setPickQuery(""); }}
                style={{ width: "100%", borderRadius: 12, border: isEditing ? `1px solid ${ACC}` : p ? "1px solid oklch(30% 0.01 240)" : "1px dashed oklch(34% 0.01 240)", background: p ? RAISE : "oklch(18% 0.008 240)", cursor: "pointer", padding: "9px 6px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}
              >
                {p ? (
                  <>
                    <Sprite species={p.slug} w={56} h={44} scale={1.3} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "oklch(94% 0.004 240)", lineHeight: 1.2, textAlign: "center" }}>{p.name}</span>
                    <span style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" }}>
                      {typesFor(p.types).map((t) => (
                        <span key={t.name} style={{ borderRadius: 5, padding: "1px 6px", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "#fff", background: t.hex }}>{t.short}</span>
                      ))}
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ width: 56, height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "oklch(42% 0.01 240)" }}>+</span>
                    <span style={{ fontSize: 10, color: "oklch(48% 0.01 240)" }}>empty</span>
                  </>
                )}
              </button>
              {isEditing && (
                <SlotPicker
                  pokemon={pokemon} usage={usage} query={pickQuery} setQuery={setPickQuery}
                  onPick={(s) => { onSet(i, s); setEditing(null); setPickQuery(""); }}
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
  pokemon, usage, query, setQuery, onPick, onClear, onClose,
}: {
  pokemon: PokemonRef[];
  usage: Record<string, number>;
  query: string;
  setQuery: (v: string) => void;
  onPick: (slug: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const results = useMemo(() => {
    const n = query.trim().toLowerCase();
    const list = n
      ? pokemon.filter((p) => p.name.toLowerCase().includes(n) || p.types.some((t) => t.toLowerCase().includes(n)) || p.abilities.some((a) => a.toLowerCase().includes(n)))
      : pokemon;
    return list.slice(0, 60);
  }, [query, pokemon]);
  return (
    <div style={{ position: "absolute", left: 0, top: "100%", zIndex: 30, marginTop: 6, width: 246, maxWidth: "min(246px, 44vw)", borderRadius: 12, border: "1px solid oklch(32% 0.01 240)", background: "oklch(20% 0.008 240)", padding: 9, boxShadow: "0 20px 44px rgba(0,0,0,.5)" }}>
      <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
        <input
          autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, type, ability…"
          style={{ flex: 1, minWidth: 0, borderRadius: 8, height: 30, border: "1px solid oklch(30% 0.01 240)", background: "oklch(16% 0.008 240)", color: "oklch(94% 0.004 240)", padding: "0 9px", fontSize: 12 }}
        />
        <button onClick={onClose} style={{ borderRadius: 8, border: "1px solid oklch(30% 0.01 240)", background: "none", color: "oklch(72% 0.01 240)", padding: "0 9px", fontSize: 12, cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        {results.map((p) => (
          <button key={p.slug} onClick={() => onPick(p.slug)} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", border: "none", background: "none", borderRadius: 8, padding: "3px 6px", cursor: "pointer", textAlign: "left" }}>
            <Sprite species={p.slug} w={40} h={30} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: "oklch(94% 0.004 240)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
            <span className="mono" style={{ fontSize: 10, color: "oklch(56% 0.012 240)", flexShrink: 0 }}>{usage[p.slug] != null ? `${usage[p.slug]}%` : ""}</span>
          </button>
        ))}
      </div>
      <button onClick={onClear} style={{ width: "100%", marginTop: 6, borderRadius: 8, border: "1px solid oklch(30% 0.01 240)", background: "none", color: "oklch(72% 0.01 240)", padding: "5px 0", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Clear slot</button>
    </div>
  );
}

function TourModal({ step, onStep, onClose }: { step: number; onStep: (n: number) => void; onClose: () => void }) {
  const t = TOUR[step] ?? TOUR[0]!;
  const last = step === TOUR.length - 1;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.62)", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 440, borderRadius: 14, border: "1px solid oklch(30% 0.01 240)", background: "oklch(20% 0.008 240)", padding: 20, boxShadow: "0 18px 40px rgba(0,0,0,.45)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "oklch(54% 0.012 240)" }}>Step {step + 1} of {TOUR.length}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 11, color: "oklch(54% 0.012 240)", cursor: "pointer" }}>Skip tour ✕</button>
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{t.title}</h3>
        <p style={{ margin: "9px 0 0", fontSize: 13, lineHeight: 1.6, color: "oklch(76% 0.01 240)" }}>{t.body}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
          <span style={{ display: "flex", gap: 5 }}>
            {TOUR.map((_, i) => <span key={i} style={{ width: 6, height: 6, borderRadius: 999, background: i === step ? ACC : "oklch(30% 0.01 240)" }} />)}
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onStep(Math.max(0, step - 1))} style={{ borderRadius: 8, border: "1px solid oklch(30% 0.01 240)", background: "none", color: "oklch(76% 0.01 240)", padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Back</button>
            <button onClick={() => (last ? onClose() : onStep(step + 1))} style={{ borderRadius: 8, background: ACC, color: "oklch(16% 0.008 240)", border: "none", padding: "5px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>{last ? "Finish" : "Next"}</button>
          </span>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Battle view
// ===========================================================================

const SPOTS: Record<string, { scale: number; padW: string; padH: string; padGap: string; flip: number; lift: string }> = {
  "opponent:0": { scale: 3.2, padW: "92%", padH: "19px", padGap: "-8px", flip: 1, lift: "18px" },
  "opponent:1": { scale: 3.2, padW: "92%", padH: "19px", padGap: "-8px", flip: 1, lift: "0px" },
  "user:0": { scale: 3.2, padW: "92%", padH: "19px", padGap: "-8px", flip: -1, lift: "0px" },
  "user:1": { scale: 3.2, padW: "92%", padH: "19px", padGap: "-8px", flip: -1, lift: "18px" },
};

function koText(d: ReturnType<typeof calculateDamage> | null): { text: string; color: string } {
  const tert = "oklch(48% 0.01 240)";
  if (!d || d.maxDamage <= 0) return { text: "-", color: tert };
  let text: string;
  if (d.ohkoProbability >= 1) text = "1HKO";
  else if (d.ohkoProbability > 0) text = `${Math.round(d.ohkoProbability * 100)}% 1HKO`;
  else if ((d.twoHitKoProbability ?? 0) >= 1) text = "2HKO";
  else if ((d.twoHitKoProbability ?? 0) > 0) text = `${Math.round((d.twoHitKoProbability ?? 0) * 100)}% 2HKO`;
  else text = `${Math.max(2, Math.ceil(100 / (d.maxPercent || 1)))}HKO`;
  const color = text.includes("1HKO") ? POS : WARN;
  return { text, color };
}

function BattleView({
  pokemon, bySlug, items, megaForms, userTeam, oppTeam, loadedSets, onBack, advancedTools,
}: {
  pokemon: PokemonRef[];
  bySlug: Map<string, PokemonRef>;
  items: string[];
  megaForms: Record<string, MegaForme>;
  userTeam: string[];
  oppTeam: string[];
  loadedSets: Record<string, KnownSet>;
  onBack: () => void;
  advancedTools?: React.ReactNode;
}) {
  void pokemon;
  const nameOf = (s: string): string => bySlug.get(s)?.name ?? s;
  const matchAbilities = useMemo(() => {
    const set = new Set<string>(ABILITY_CHANGE_RESULTS);
    for (const s of [...userTeam, ...oppTeam]) for (const a of bySlug.get(s)?.abilities ?? []) set.add(a);
    return [...set].sort();
  }, [userTeam, oppTeam, bySlug]);

  const [round, setRound] = useState(1);
  const [uTeam, setUTeam] = useState<string[]>(userTeam);
  const [oTeam, setOTeam] = useState<string[]>(oppTeam);
  const [activeUser, setActiveUser] = useState<[string, string]>([userTeam[0]!, userTeam[1] ?? userTeam[0]!]);
  const [activeOpp, setActiveOpp] = useState<[string, string]>([oppTeam[0]!, oppTeam[1] ?? oppTeam[0]!]);
  const [sentUser, setSentUser] = useState<string[]>([userTeam[0]!, userTeam[1]].filter(Boolean) as string[]);
  const [sentOpp, setSentOpp] = useState<string[]>([oppTeam[0]!, oppTeam[1]].filter(Boolean) as string[]);
  const [selUser, setSelUser] = useState<0 | 1>(0);
  const [selOpp, setSelOpp] = useState<0 | 1>(0);
  const [target, setTarget] = useState<Record<string, 0 | 1>>({});
  const [spreadOpen, setSpreadOpen] = useState(false);

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
  const [magicRoom, setMagicRoom] = useState(false);
  const [wonderRoom, setWonderRoom] = useState(false);
  const [uCond, setUCond] = useState<SideCond>(emptyCond());
  const [oCond, setOCond] = useState<SideCond>(emptyCond());
  const [background, setBackground] = useState<string>("meadow");
  const [orders, setOrders] = useState<{ 0?: Order; 1?: Order }>({});
  const [log, setLog] = useState<LogRound[]>([]);
  const [logIdx, setLogIdx] = useState(0);
  const [itemPicker, setItemPicker] = useState<Side | null>(null);
  const [itemQuery, setItemQuery] = useState("");

  const teamSig = useMemo(() => `user:${userTeam.join("|")}::opponent:${oppTeam.join("|")}`, [userTeam, oppTeam]);
  const battleFirst = useRef(true);
  useEffect(() => {
    if (battleFirst.current) {
      battleFirst.current = false;
      try {
        const raw = localStorage.getItem(BATTLE_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          if (s.sig !== teamSig || (typeof s.ts === "number" && Date.now() - s.ts > BATTLE_TTL_MS)) {
            localStorage.removeItem(BATTLE_KEY);
            return;
          }
          if (Array.isArray(s.uTeam)) setUTeam(s.uTeam);
          if (Array.isArray(s.oTeam)) setOTeam(s.oTeam);
          if (s.activeUser) setActiveUser(s.activeUser);
          if (s.activeOpp) setActiveOpp(s.activeOpp);
          if (s.sentUser) setSentUser(s.sentUser);
          if (s.sentOpp) setSentOpp(s.sentOpp);
          if (s.mon) setMon(s.mon);
          if (s.weather) setWeather(s.weather);
          if (s.terrain) setTerrain(s.terrain);
          if (typeof s.trickRoom === "boolean") setTrickRoom(s.trickRoom);
          if (typeof s.gravity === "boolean") setGravity(s.gravity);
          if (typeof s.magicRoom === "boolean") setMagicRoom(s.magicRoom);
          if (typeof s.wonderRoom === "boolean") setWonderRoom(s.wonderRoom);
          if (s.uCond) setUCond(s.uCond);
          if (s.oCond) setOCond(s.oCond);
          if (typeof s.round === "number") setRound(s.round);
          if (s.background) setBackground(s.background);
          if (Array.isArray(s.log)) { setLog(s.log); setLogIdx(Math.max(0, s.log.length - 1)); }
        }
      } catch { /* ignore */ }
      return;
    }
    try {
      localStorage.setItem(BATTLE_KEY, JSON.stringify({ ts: Date.now(), sig: teamSig, uTeam, oTeam, activeUser, activeOpp, sentUser, sentOpp, mon, weather, terrain, trickRoom, gravity, magicRoom, wonderRoom, uCond, oCond, round, background, log }));
    } catch { /* ignore */ }
  }, [teamSig, uTeam, oTeam, activeUser, activeOpp, sentUser, sentOpp, mon, weather, terrain, trickRoom, gravity, magicRoom, wonderRoom, uCond, oCond, round, background, log]);

  const monOf = (side: Side, slug: string): MonState => mon[monKey(side, slug)] || emptyMon();
  const patchMon = (side: Side, slug: string, p: Partial<MonState>) => {
    const k = monKey(side, slug);
    setMon((m) => ({ ...m, [k]: { ...(m[k] ?? emptyMon()), ...p } }));
  };

  const asTuple = (t: readonly PokemonType[]) => t.slice(0, 2) as [PokemonType] | [PokemonType, PokemonType];
  const formeOf = (side: Side, slug: string): SlotForm["forme"] | undefined => {
    const st = monOf(side, slug);
    if (st.mega && megaForms[slug]) {
      const m = megaForms[slug];
      return { name: m.name, baseStats: m.baseStats, types: asTuple(m.types), ability: m.ability };
    }
    if (slug === "ditto" && st.transformInto) {
      const t = bySlug.get(st.transformInto);
      const ditto = bySlug.get("ditto");
      if (t) return { name: t.name, baseStats: { ...t.baseStats, hp: ditto?.baseStats.hp ?? t.baseStats.hp }, types: asTuple(t.types), ability: t.abilities[0] ?? "", moves: t.moves, species: t.slug };
    }
    return undefined;
  };
  const toSlot = (side: Side, slug: string): SlotForm => {
    const st = monOf(side, slug);
    const mega = st.mega ? megaForms[slug] : undefined;
    const stages = st.commander
      ? (Object.fromEntries((Object.keys(st.stages) as (keyof StageStats)[]).map((k) => [k, Math.max(-6, Math.min(6, st.stages[k] + 2))])) as StageStats)
      : st.stages;
    return { ...emptySlot(slug), hpPct: st.hpPct, status: st.status, ability: st.ability, item: mega ? mega.item : st.itemUsed ? "None" : st.item, nature: st.nature, evs: st.evs, stages, forme: formeOf(side, slug) };
  };

  const built = useMemo(() => {
    const side = (sd: Side, slugs: [string, string], c: SideCond): SideForm => ({ slots: [toSlot(sd, slugs[0]), toSlot(sd, slugs[1])], ...c });
    const form: TurnForm = { user: side("user", activeUser, uCond), opponent: side("opponent", activeOpp, oCond), weather, terrain, trickRoom, gravity, note: "" };
    return buildStateWithEntry(form, bySlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUser, activeOpp, mon, weather, terrain, trickRoom, gravity, uCond, oCond, bySlug]);

  const recommendations = useMemo(() => (built?.state ? recommend(built.state, { limit: 6 }) : []), [built]);

  const swapSides = () => {
    setUTeam(oTeam); setOTeam(uTeam);
    setActiveUser(activeOpp); setActiveOpp(activeUser);
    setSentUser(sentOpp); setSentOpp(sentUser);
    setUCond(oCond); setOCond(uCond);
    setOrders({});
    setMon((m) => {
      const next: Record<string, MonState> = {};
      for (const [k, v] of Object.entries(m)) next[k.startsWith("user:") ? "opponent:" + k.slice(5) : "user:" + k.slice(9)] = v;
      return next;
    });
  };

  const userAlive = uTeam.filter((s) => monOf("user", s).hpPct > 0).length;
  const oppAlive = oTeam.filter((s) => monOf("opponent", s).hpPct > 0).length;
  const battleOver = userAlive === 0 || oppAlive === 0;

  const fieldSummaryBits = (): string[] => {
    const b: string[] = [];
    if (weather !== "none") b.push(weather);
    if (terrain !== "none") b.push(`${terrain} terrain`);
    if (trickRoom) b.push("Trick Room");
    if (gravity) b.push("Gravity");
    if (magicRoom) b.push("Magic Room");
    if (wonderRoom) b.push("Wonder Room");
    if (uCond.tailwind) b.push("your Tailwind");
    if (oCond.tailwind) b.push("their Tailwind");
    return b;
  };

  const advanceRound = () => {
    const lines: LogLine[] = [];
    ([0, 1] as const).forEach((i) => {
      const o = orders[i];
      const slug = activeUser[i];
      if (o) {
        const tgt = nameOf(activeOpp[o.target]);
        const mv = built?.state?.user.active[i]?.moves.find((m) => m.name === o.move);
        const isStatus = !mv || mv.category === "status" || mv.power == null;
        lines.push({ side: "user", text: `${nameOf(slug)} used ${o.move}${isStatus ? "" : " on " + tgt}.` });
      } else {
        lines.push({ side: "neutral", text: `${nameOf(slug)} had no order entered.` });
      }
    });
    const fb = fieldSummaryBits();
    if (fb.length) lines.push({ side: "neutral", text: `Field: ${fb.join(", ")}.` });
    setLog((l) => { const next = [...l, { round, lines }]; setLogIdx(next.length - 1); return next; });
    setRound((r) => r + 1);
    setOrders({});
  };
  const prevRound = () => {
    if (round <= 1) return;
    setRound((r) => Math.max(1, r - 1));
    setLog((l) => { const next = l.slice(0, -1); setLogIdx(Math.max(0, next.length - 1)); return next; });
    setOrders({});
  };

  const chosenCount = ([0, 1] as const).filter((i) => orders[i]).length;

  // ---- shared field / side-panel controls -------------------------------
  const weatherOpts = (["sun", "rain", "sand", "snow"] as const).map((w) => ({ name: w, ...pill(weather === w), onClick: () => setWeather(weather === w ? "none" : (w as Weather)) }));
  const terrainOpts = (["electric", "grassy", "misty", "psychic"] as const).map((t) => ({ name: t, ...pill(terrain === t), onClick: () => setTerrain(terrain === t ? "none" : (t as Terrain)) }));
  const roomOpts: { label: string; bg: string; fg: string; border: string; onClick: () => void }[] = [
    { label: "Trick Room", ...pill(trickRoom), onClick: () => setTrickRoom(!trickRoom) },
    { label: "Gravity", ...pill(gravity), onClick: () => setGravity(!gravity) },
    { label: "Magic Room", ...pill(magicRoom), onClick: () => setMagicRoom(!magicRoom) },
    { label: "Wonder Room", ...pill(wonderRoom), onClick: () => setWonderRoom(!wonderRoom) },
  ];

  // ---- arena -------------------------------------------------------------
  const stage = STAGES.find((b) => b.id === background) ?? STAGES[0]!;
  const fxLayers: string[] = [];
  const pushFx = (v: string | undefined) => { if (v && v !== "none") fxLayers.push(v); };
  if (trickRoom) pushFx(ROOM_FX.trickRoom);
  if (gravity) pushFx(ROOM_FX.gravity);
  if (magicRoom) pushFx(ROOM_FX.magicRoom);
  if (wonderRoom) pushFx(ROOM_FX.wonderRoom);
  if (weather !== "none") pushFx(WEATHER_FX[weather]);
  if (terrain !== "none") pushFx(TERRAIN_FX[terrain]);
  const weatherFx = fxLayers.length ? fxLayers.join(", ") : "none";

  const focus = (side: Side, i: 0 | 1) => (side === "user" ? setSelUser(i) : setSelOpp(i));
  const isFocused = (side: Side, i: 0 | 1) => (side === "user" ? selUser : selOpp) === i;

  const plate = (side: Side, i: 0 | 1) => {
    const slug = (side === "user" ? activeUser : activeOpp)[i];
    const p = bySlug.get(slug)!;
    const st = monOf(side, slug);
    const forme = formeOf(side, slug);
    const nm = forme ? forme.name : p.name;
    const types = forme ? forme.types : p.types;
    return (
      <button key={`${side}:${i}`} onClick={() => focus(side, i)} style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative", width: "100%", minWidth: 0, maxWidth: 210, textAlign: "left", cursor: "pointer", borderRadius: 10, padding: "6px 9px", border: `1px solid ${isFocused(side, i) ? ACC : side === "user" ? "oklch(72% 0.13 150 / 0.5)" : "oklch(68% 0.16 25 / 0.5)"}`, background: "oklch(17% 0.008 240 / 0.9)", backdropFilter: "blur(4px)" }}>
        <span style={{ display: "flex", alignItems: "center", flexWrap: "nowrap", gap: 4, minWidth: 0, height: 17 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 800, lineHeight: 1.2, color: "oklch(94% 0.004 240)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nm}</span>
          <span style={{ flexShrink: 0, borderRadius: 4, padding: "1px 5px", fontSize: 9, fontWeight: 800, textTransform: "uppercase", visibility: st.status === "none" ? "hidden" : "visible", background: STATUS_COLOR[st.status] ?? "transparent", color: "#fff" }}>{STATUS_SHORT[st.status] ?? ""}</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "3px 5px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            {typesFor(types).map((t) => <span key={t.name} style={{ flexShrink: 0, borderRadius: 4, padding: "1px 4px", fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "#fff", background: t.hex }}>{t.short}</span>)}
          </span>
          <span style={{ flex: "1 1 70px", minWidth: 56, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ flex: 1, minWidth: 24, height: 6, borderRadius: 3, background: "oklch(30% 0.01 240)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${st.hpPct}%`, background: hpColor(st.hpPct) }} /></span>
            <span className="mono" style={{ flexShrink: 0, fontSize: 11, color: "oklch(78% 0.01 240)" }}>{st.hpPct}%</span>
          </span>
        </span>
      </button>
    );
  };

  const arenaMon = (side: Side, i: 0 | 1) => {
    const key = `${side}:${i}`;
    const slug = (side === "user" ? activeUser : activeOpp)[i];
    const st = monOf(side, slug);
    const spot = SPOTS[key]!;
    const sel = isFocused(side, i);
    const fainted = st.hpPct <= 0;
    const filter = fainted
      ? "grayscale(1) opacity(0.4) drop-shadow(0 2px 3px rgba(0,0,0,.55))"
      : sel
        ? "drop-shadow(0 0 7px oklch(82% 0.1 190)) drop-shadow(0 2px 4px rgba(0,0,0,.6))"
        : "drop-shadow(0 2px 4px rgba(0,0,0,.6)) drop-shadow(0 0 2px rgba(0,0,0,.5))";
    const padBg = sel
      ? "radial-gradient(50% 60% at 50% 40%, rgba(255,255,255,.85), oklch(84% 0.11 190 / .6) 55%, oklch(72% 0.1 190 / .25) 78%, transparent)"
      : "radial-gradient(50% 60% at 50% 40%, rgba(255,255,255,.55), rgba(255,255,255,.18) 65%, rgba(255,255,255,.04) 85%, transparent)";
    const padShadow = sel
      ? "0 0 0 2px oklch(84% 0.11 190 / .85), 0 0 18px oklch(76% 0.1 190 / .65), 0 4px 10px rgba(0,0,0,.5)"
      : "0 3px 9px rgba(0,0,0,.5)";
    const hasStatus = !fainted && st.status !== "none";
    return (
      <button key={key} onClick={() => focus(side, i)} style={{ flex: "1 1 0", minWidth: 0, maxWidth: `${40 * spot.scale}px`, background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", marginBottom: spot.lift }}>
        <span style={{ position: "relative", display: "block", width: "100%" }}>
          <Sprite species={slug} w="100%" h={96} scale={spot.scale} flip={spot.flip < 0} filter={filter} />
          {hasStatus && <>
            <span style={{ position: "absolute", inset: "6%", borderRadius: "50%", background: STATUS_WASH[st.status] ?? "transparent", pointerEvents: "none" }} />
            <span title={st.status} style={{ position: "absolute", top: -2, right: 0, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 18, padding: "0 3px", borderRadius: 999, fontSize: 10, fontWeight: 800, lineHeight: 1, background: STATUS_COLOR[st.status] ?? "transparent", color: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.6)" }}>{STATUS_GLYPH[st.status] ?? ""}</span>
          </>}
        </span>
        <span style={{ width: spot.padW, height: spot.padH, borderRadius: "50%", background: padBg, boxShadow: padShadow, marginTop: spot.padGap }} />
      </button>
    );
  };

  const fieldCard = (
    <div style={{ alignSelf: "center", width: 262, position: "relative", zIndex: 3, borderRadius: 12, border: "1px solid rgba(255,255,255,0.18)", background: "oklch(17% 0.008 240 / 0.9)", backdropFilter: "blur(7px)", boxShadow: "0 6px 18px rgba(0,0,0,0.4)", padding: "7px 9px", display: "flex", flexDirection: "column", gap: 5, height: 113 }}>
      {([["Weather", weatherOpts, false], ["Terrain", terrainOpts, false], ["Rooms", roomOpts, true]] as const).map(([label, opts, isRoom]) => (
        <div key={label} style={{ display: "grid", gridTemplateColumns: "40px minmax(0,1fr)", alignItems: "baseline", columnGap: 6, rowGap: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: "18px", color: "oklch(58% 0.012 240)" }}>{label}</span>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {opts.map((o) => {
              const text = "name" in o ? o.name : o.label;
              return (
                <button key={text} onClick={o.onClick} style={{ borderRadius: 6, height: 18, padding: "0 6px", fontSize: 10, fontWeight: 700, lineHeight: "16px", whiteSpace: "nowrap", border: "none", cursor: "pointer", textTransform: isRoom ? "none" : "capitalize", background: o.bg, color: o.fg }}>{text}</button>
              );
            })}
          </span>
        </div>
      ))}
    </div>
  );

  // ---- side panels -------------------------------------------------------
  const sidePanel = (which: "user" | "opponent") => {
    const cond = which === "user" ? uCond : oCond;
    const setCond = which === "user" ? setUCond : setOCond;
    const setC = (patch: Partial<SideCond>) => setCond({ ...cond, ...patch });
    const title = which === "user" ? "Your side" : "Opponent side";
    const color = which === "user" ? POS : NEG;
    const border = which === "user" ? "oklch(72% 0.13 150 / 0.45)" : "oklch(68% 0.16 25 / 0.45)";
    const bg = which === "user" ? "oklch(72% 0.13 150 / 0.07)" : "oklch(68% 0.16 25 / 0.07)";
    const hazardsUp = cond.stealthRock || cond.spikes > 0 || cond.toxicSpikes > 0 || cond.stickyWeb;
    const screens: [keyof SideCond, string][] = [["tailwind", "Tailwind"], ["reflect", "Reflect"], ["lightScreen", "L. Screen"], ["auroraVeil", "Aurora Veil"]];
    const hazardToggles: [keyof SideCond, string][] = [["stealthRock", "Stealth Rock"], ["stickyWeb", "Sticky Web"]];
    const hazardLevels: [keyof SideCond, string, number][] = [["spikes", "Spikes", 3], ["toxicSpikes", "Toxic Spikes", 2]];
    return (
      <div style={{ minWidth: 0, borderRadius: 12, border: `1px solid ${border}`, background: bg, padding: 11, display: "flex", flexDirection: "column", gap: 7, fontSize: 12 }}>
        <h3 style={{ fontSize: 12, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, color }}>{title}
          {hazardsUp && <span style={{ fontSize: 9, fontWeight: 700, color: "oklch(80% 0.13 85)" }}>⚠ hazards up</span>}
        </h3>
        <div>
          <span style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "oklch(54% 0.012 240)", marginBottom: 5 }}>Screens</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 5 }}>
            {screens.map(([k, label]) => { const on = cond[k] as boolean; const q = pill(on); return (
              <button key={k} onClick={() => setC({ [k]: !on } as Partial<SideCond>)} style={{ borderRadius: 7, padding: "5px 7px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", border: `1px solid ${q.border}`, cursor: "pointer", background: q.bg, color: q.fg }}>{label}</button>
            ); })}
          </div>
        </div>
        <div>
          <span style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "oklch(54% 0.012 240)", marginBottom: 5 }}>Hazards</span>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5 }}>
            {hazardToggles.map(([k, label]) => { const on = cond[k] as boolean; const q = pill(on); return (
              <button key={k} onClick={() => setC({ [k]: !on } as Partial<SideCond>)} style={{ borderRadius: 7, padding: "5px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", border: `1px solid ${q.border}`, cursor: "pointer", background: q.bg, color: q.fg }}>{label}</button>
            ); })}
            {hazardLevels.map(([k, label, max]) => (
              <span key={k} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 78px", alignItems: "center", gap: 6, width: "100%" }}>
                <span style={{ minWidth: 0, fontSize: 11, fontWeight: 700, lineHeight: 1.2, color: "oklch(66% 0.012 240)" }}>{label}</span>
                <span style={{ display: "grid", gridTemplateColumns: "repeat(3, 24px)", gap: 3 }}>
                  {Array.from({ length: max }, (_, i2) => { const n = i2 + 1; const on = (cond[k] as number) === n; const q = pill(on); return (
                    <button key={n} onClick={() => setC({ [k]: on ? 0 : n } as Partial<SideCond>)} style={{ borderRadius: 6, border: `1px solid ${q.border}`, background: q.bg, color: q.fg, width: 24, height: 22, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>{n}</button>
                  ); })}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ---- orders + log ------------------------------------------------------
  const orderSlot = (i: 0 | 1) => {
    const slug = activeUser[i];
    const o = orders[i];
    const p = bySlug.get(slug)!;
    const mst = monOf("user", slug);
    const focused = selUser === i;
    const hasStatus = mst.status !== "none";
    return (
      <div key={i} style={{ minWidth: 0, display: "flex", alignItems: "flex-start", gap: 7, borderRadius: 10, border: `1px solid ${o ? "oklch(72% 0.1 190 / 0.4)" : "oklch(30% 0.01 240)"}`, background: o ? "oklch(72% 0.1 190 / 0.08)" : RAISE, padding: "7px 8px" }}>
        <button onClick={() => setSelUser(i)} title={focused ? `${p.name} is shown in Your active` : `Show ${p.name} in Your active`} style={{ position: "relative", flexShrink: 0, display: "flex", alignItems: "center", borderRadius: 8, border: `1px solid ${focused ? ACC : "oklch(30% 0.01 240)"}`, background: focused ? "oklch(72% 0.1 190 / 0.18)" : "transparent", padding: "1px 3px", cursor: "pointer" }}>
          <Sprite species={slug} w={36} h={27} />
          {hasStatus && <span title={mst.status} style={{ position: "absolute", top: -4, right: -4, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 15, height: 15, padding: "0 2px", borderRadius: 999, fontSize: 9, fontWeight: 800, lineHeight: 1, background: STATUS_COLOR[mst.status] ?? "transparent", color: "#fff" }}>{STATUS_GLYPH[mst.status] ?? ""}</span>}
        </button>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: o ? "oklch(92% 0.01 240)" : "oklch(58% 0.012 240)" }}>{o ? `${o.move} → ${nameOf(activeOpp[o.target])}` : "No order yet"}</span>
          <span style={{ fontSize: 10, color: "oklch(56% 0.012 240)" }}>{o ? `${p.name} · click another move to change` : `${p.name} · click a move on its card`}</span>
        </span>
        {o && <button onClick={() => setOrders((prev) => { const n = { ...prev }; delete n[i]; return n; })} style={{ flexShrink: 0, border: "none", background: "none", color: "oklch(58% 0.012 240)", fontSize: 12, cursor: "pointer" }}>✕</button>}
      </div>
    );
  };

  const fieldSummary = fieldSummaryBits();
  const logEntry = log[Math.min(logIdx, Math.max(0, log.length - 1))];

  // ---- recommendations presentation -------------------------------------
  const heroRec = recommendations[0];
  const recBorder = (i: number) => (i === 0 ? "oklch(72% 0.1 190 / 0.35)" : "oklch(30% 0.01 240)");
  const recRankBg = (i: number) => (i === 0 ? ACC : "oklch(45% 0.03 240)");
  const recBar = (i: number) => (i === 0 ? ACC : "oklch(50% 0.04 240)");
  const recScoreColor = (i: number) => (i === 0 ? "oklch(82% 0.1 190)" : "oklch(66% 0.012 240)");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 13, color: "oklch(94% 0.004 240)" }}>
      {/* Round toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, borderRadius: 12, border: "1px solid oklch(30% 0.01 240)", background: "oklch(20% 0.008 240)", padding: "9px 12px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "oklch(78% 0.1 190)", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}>← Team preview</button>
        <span className="mono" style={{ borderRadius: 999, background: "oklch(26% 0.008 240)", padding: "3px 11px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>ROUND {round}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={swapSides} title="Swap which side is yours" style={{ borderRadius: 9, border: "1px solid oklch(30% 0.01 240)", background: "oklch(24% 0.008 240)", color: "oklch(88% 0.01 240)", height: 34, padding: "0 11px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>⇄ Swap sides</button>
          <select value={background} onChange={(e) => setBackground(e.target.value)} aria-label="Stage" style={{ borderRadius: 8, height: 34, border: "1px solid oklch(30% 0.01 240)", background: "oklch(24% 0.008 240)", color: "oklch(88% 0.01 240)", padding: "0 9px", fontSize: 11 }}>
            {STAGES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
          <button onClick={prevRound} style={{ borderRadius: 9, border: "1px solid oklch(30% 0.01 240)", background: "none", color: "oklch(88% 0.01 240)", padding: "0 12px", height: 34, fontWeight: 700, cursor: "pointer", fontSize: 11 }}>← Back a round</button>
          {battleOver ? (
            <button onClick={() => { try { localStorage.removeItem(BATTLE_KEY); } catch { /* ignore */ } onBack(); }} style={{ borderRadius: 10, background: ACC, color: "oklch(16% 0.008 240)", padding: "0 20px", height: 34, fontWeight: 800, border: "none", cursor: "pointer", fontSize: 13 }}>New battle</button>
          ) : (
            <button onClick={advanceRound} style={{ borderRadius: 10, background: ACC, color: "oklch(16% 0.008 240)", padding: "0 20px", height: 34, fontWeight: 800, border: "none", cursor: "pointer", fontSize: 13, boxShadow: "0 0 0 3px oklch(72% 0.1 190 / 0.18)" }}>Next round →</button>
          )}
        </span>
      </div>

      {/* Best play + ranked options */}
      {heroRec && (
        <div style={{ borderRadius: 14, background: "oklch(72% 0.1 190 / 0.13)", border: "1px solid oklch(72% 0.1 190 / 0.34)", padding: "15px 17px", display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <span style={{ borderRadius: 999, background: ACC, color: "oklch(16% 0.008 240)", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", padding: "3px 10px" }}>Best play this round</span>
            <span style={{ fontSize: 11, color: "oklch(72% 0.01 240)" }}>score <span className="mono" style={{ color: "oklch(82% 0.1 190)" }}>{heroRec.breakdown.total.toFixed(3)}</span> · confidence {(heroRec.confidence * 100).toFixed(0)}% · Balanced profile</span>
          </div>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 800, lineHeight: 1.35, letterSpacing: "-0.01em" }}>{heroRec.actionLines.join(" · ")}</p>
          <p style={{ margin: 0, fontSize: 12, color: "oklch(76% 0.01 240)", lineHeight: 1.5 }}>{heroRec.expectedPosition}</p>
          <p style={{ margin: 0, fontSize: 11, color: "oklch(68% 0.16 25)" }}>Risk: {heroRec.mainRisk}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 3, borderTop: "1px solid oklch(72% 0.1 190 / 0.22)", paddingTop: 9 }}>
            {recommendations.slice(1, 3).map((r, k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11, color: "oklch(66% 0.012 240)" }}>
                <span style={{ borderRadius: 5, background: "oklch(30% 0.01 240)", color: "oklch(76% 0.01 240)", fontWeight: 800, fontSize: 10, padding: "1px 6px", flexShrink: 0 }}>#{k + 2}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{r.actionLines.join(" · ")}</span>
                <span className="mono" style={{ flexShrink: 0, color: "oklch(60% 0.012 240)" }}>{r.breakdown.total.toFixed(3)}</span>
              </div>
            ))}
          </div>
          <details style={{ borderTop: "1px solid oklch(72% 0.1 190 / 0.22)", paddingTop: 10 }}>
            <summary style={{ listStyle: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "oklch(66% 0.012 240)", marginBottom: 8 }}>All ranked options<span style={{ fontSize: 9, color: "oklch(58% 0.012 240)" }}>▾ {recommendations.length} lines</span></summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {recommendations.map((r, i) => <RankedOption key={i} r={r} i={i} border={recBorder(i)} rankBg={recRankBg(i)} bar={recBar(i)} scoreColor={recScoreColor(i)} />)}
            </div>
          </details>
        </div>
      )}
      {!heroRec && (
        <div style={{ borderRadius: 14, background: "oklch(72% 0.1 190 / 0.13)", border: "1px solid oklch(72% 0.1 190 / 0.34)", padding: "15px 17px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "oklch(76% 0.01 240)" }}>Assign a Pokémon to all four battle spots to rank plays.</p>
        </div>
      )}

      {battleOver && (
        <p style={{ margin: 0, borderRadius: 12, border: "1px solid oklch(80% 0.13 85 / 0.4)", background: "oklch(80% 0.13 85 / 0.1)", padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "oklch(84% 0.13 85)" }}>
          🏆 {userAlive === 0 && oppAlive === 0 ? "Both sides fainted - draw." : userAlive === 0 ? "Opponent wins - your team fainted." : "You win - opponent team fainted."} Use “New battle” above to restart.
        </p>
      )}

      {/* Arena row */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(166px,0.55fr) minmax(0,2fr) minmax(166px,0.55fr)", gap: 10, alignItems: "stretch" }}>
        {sidePanel("user")}
        <div style={{ minWidth: 0, position: "relative", minHeight: 238, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 6, padding: 10, borderRadius: 16, border: "1px solid oklch(30% 0.01 240)", overflow: "hidden", background: stage.sky }}>
          <div style={{ position: "absolute", left: "-20%", right: "-20%", top: stage.horizon, height: 130, background: stage.glow, filter: "blur(16px)" }} />
          <div style={{ position: "absolute", left: "-60%", right: "-60%", bottom: "-30%", top: stage.horizon, background: stage.ground, transform: "perspective(260px) rotateX(44deg)", transformOrigin: "50% 0%" }} />
          <div style={{ position: "absolute", left: "-60%", right: "-60%", bottom: "-30%", top: stage.horizon, backgroundImage: stage.grid, backgroundSize: "46px 46px", opacity: 0.32, transform: "perspective(260px) rotateX(44deg)", transformOrigin: "50% 0%" }} />
          <div style={{ position: "absolute", inset: 0, background: weatherFx, pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 70px rgba(0,0,0,0.5), inset 0 -30px 50px rgba(0,0,0,0.35)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, display: "flex", flexWrap: "nowrap", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5 }}>{([0, 1] as const).map((i) => plate("user", i))}</div>
            {fieldCard}
            <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>{([0, 1] as const).map((i) => plate("opponent", i))}</div>
          </div>
          <div style={{ position: "relative", zIndex: 2, paddingTop: 2, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
            <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", alignItems: "flex-end", justifyContent: "flex-start", gap: 4 }}>{([0, 1] as const).map((i) => arenaMon("user", i))}</div>
            <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 4 }}>{([0, 1] as const).map((i) => arenaMon("opponent", i))}</div>
          </div>
        </div>
        {sidePanel("opponent")}
      </div>

      {/* Orders + log */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12, fontSize: 12, alignItems: "start" }}>
        <div style={{ borderRadius: 12, border: "1px solid oklch(72% 0.1 190 / 0.3)", background: "oklch(20% 0.008 240)", padding: 12, display: "flex", flexDirection: "column", gap: 9, height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "oklch(72% 0.01 240)", margin: 0, whiteSpace: "nowrap" }}>Your orders · round {round}</h3>
            <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: chosenCount === 2 ? POS : WARN }}>{chosenCount === 2 ? "both orders set" : `${chosenCount} of 2 set`}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8 }}>{([0, 1] as const).map((i) => orderSlot(i))}</div>
          <p style={{ margin: 0, fontSize: 10, color: "oklch(54% 0.012 240)", lineHeight: 1.45 }}>{fieldSummary.length ? `Recorded field: ${fieldSummary.join(", ")}.` : "No field effects recorded."}</p>
          {!battleOver && (
            <span style={{ display: "flex", gap: 7 }}>
              <button onClick={prevRound} title="Undo the last committed round" style={{ flex: "0 0 auto", borderRadius: 11, border: "1px solid oklch(32% 0.01 240)", background: "none", color: "oklch(84% 0.01 240)", padding: "11px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>← Back a round</button>
              <button onClick={advanceRound} style={{ flex: 1, minWidth: 0, borderRadius: 11, background: chosenCount === 2 ? ACC : "oklch(58% 0.05 190)", color: "oklch(16% 0.008 240)", border: "none", padding: "11px 0", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>{chosenCount === 2 ? `Commit round ${round} & continue →` : `Commit round ${round} anyway →`}</button>
            </span>
          )}
        </div>

        <div style={{ borderRadius: 12, border: "1px solid oklch(30% 0.01 240)", background: "oklch(20% 0.008 240)", padding: 12, display: "flex", flexDirection: "column", gap: 9, minWidth: 0, height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "oklch(72% 0.01 240)", margin: 0, whiteSpace: "nowrap" }}>Battle log</h3>
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => setLogIdx((i) => Math.max(0, i - 1))} title="Earlier round" style={{ borderRadius: 7, border: "1px solid oklch(32% 0.01 240)", background: "none", color: logIdx > 0 ? "oklch(86% 0.01 240)" : "oklch(40% 0.01 240)", width: 24, height: 22, fontSize: 12, lineHeight: 1, cursor: "pointer" }}>←</button>
              <span className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: "oklch(70% 0.01 240)" }}>{log.length ? `${Math.min(logIdx, log.length - 1) + 1} / ${log.length}` : "0 / 0"}</span>
              <button onClick={() => setLogIdx((i) => Math.min(log.length - 1, i + 1))} title="Later round" style={{ borderRadius: 7, border: "1px solid oklch(32% 0.01 240)", background: "none", color: logIdx < log.length - 1 ? "oklch(86% 0.01 240)" : "oklch(40% 0.01 240)", width: 24, height: 22, fontSize: 12, lineHeight: 1, cursor: "pointer" }}>→</button>
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 0, maxHeight: 264, overflowY: "auto", paddingRight: 4 }}>
            {log.length && logEntry ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, borderLeft: "2px solid oklch(58% 0.06 190)", paddingLeft: 9 }}>
                <span className="mono" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: "oklch(58% 0.012 240)" }}>ROUND {logEntry.round}</span>
                {logEntry.lines.map((ln, j) => <span key={j} style={{ fontSize: 11, lineHeight: 1.45, color: ln.side === "user" ? "oklch(84% 0.06 150)" : ln.side === "opp" ? "oklch(80% 0.07 25)" : "oklch(70% 0.01 240)" }}>{ln.text}</span>)}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 11, color: "oklch(56% 0.012 240)" }}>No rounds committed yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Active cards */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
        {renderEditor("user")}
        {renderEditor("opponent")}
      </div>

      {advancedTools}
    </div>
  );

  // -------------------------------------------------------------------------
  // Active card renderer (kept inline for access to engine helpers)
  // -------------------------------------------------------------------------
  function renderEditor(side: Side) {
    const foe = side === "opponent";
    const idx = foe ? selOpp : selUser;
    const active = foe ? activeOpp : activeUser;
    const team = foe ? oTeam : uTeam;
    const sent = foe ? sentOpp : sentUser;
    const slug = active[idx];
    const p = bySlug.get(slug)!;
    const st = monOf(side, slug);
    const mega = megaForms[slug];
    const isMega = !!mega && st.mega;
    const otherMega = team.find((x) => x !== slug && monOf(side, x).mega);
    const megaBlocked = !!mega && !isMega && !!otherMega;
    const forme = formeOf(side, slug);
    const nature = natureByName(st.nature);
    const foesActive = foe ? activeUser : activeOpp;
    const tgtIdx = (target[slug] ?? 0) as 0 | 1;
    const targetName = nameOf(foesActive[tgtIdx]);

    const attacker = built?.state ? (foe ? built.state.opponent.active[idx] : built.state.user.active[idx]) : null;
    const targetC: Combatant | null = built?.state ? ((foe ? built.state.user.active : built.state.opponent.active)[tgtIdx] ?? null) : null;
    const defenderConditions: SideConditions = (foe ? built?.state?.user.conditions : built?.state?.opponent.conditions) ?? (foe ? uCond : oCond);
    const field = built?.state?.field ?? DEFAULT_FIELD;

    const order = orders[idx as 0 | 1];
    const known = st.knownMoves || [];
    const moveState = st.moveState || {};

    const border = foe ? "oklch(68% 0.16 25 / 0.45)" : "oklch(72% 0.13 150 / 0.45)";
    const sideColor = foe ? NEG : POS;

    const abilityValue = forme?.ability ?? (st.ability || (p.abilities[0] ?? ""));
    const abilityLocked = !!forme?.ability;
    const abilityOpts = forme?.ability && !matchAbilities.includes(forme.ability) ? [forme.ability, ...matchAbilities] : [st.ability || p.abilities[0] || "", ...matchAbilities].filter((v, i2, a) => v && a.indexOf(v) === i2);
    const itemValue = isMega ? mega!.item : st.item;
    const itemsOpen = itemPicker === side;
    const itemList = itemOptions(itemValue, items).filter((it) => !itemQuery.trim() || it.toLowerCase().includes(itemQuery.trim().toLowerCase()));

    const statHeads = STAT_KEYS.map((k) => ({
      label: (k === nature.boosted && nature.boosted !== nature.lowered ? "+" : k === nature.lowered && nature.boosted !== nature.lowered ? "−" : "") + STAT_LABEL[k],
      color: k === nature.boosted && nature.boosted !== nature.lowered ? NEG : k === nature.lowered && nature.boosted !== nature.lowered ? "oklch(72% 0.1 240)" : "oklch(60% 0.012 240)",
    }));
    const baseStats = forme ? forme.baseStats : p.baseStats;

    return (
      <div key={side} style={{ borderRadius: 14, border: `1px solid ${border}`, background: "oklch(20% 0.008 240)", padding: 13, display: "flex", flexDirection: "column", gap: 11, minWidth: 0 }}>
        {/* team header row */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: sideColor }}>{foe ? "Opponent active" : "Your active"}</span>
          <span style={{ display: "flex", flexWrap: "nowrap", gap: 4 }}>
            {team.map((tslug) => {
              const tst = monOf(side, tslug);
              const activeAt = active.indexOf(tslug);
              const on = activeAt === idx;
              const fainted = tst.hpPct <= 0;
              const benched = sent.length >= BRING_LIMIT && !sent.includes(tslug);
              const tborder = on ? ACC : activeAt >= 0 ? "oklch(56% 0.06 190)" : "oklch(30% 0.01 240)";
              const tbg = on ? "oklch(72% 0.1 190 / 0.2)" : benched ? "oklch(19% 0.006 240)" : activeAt >= 0 ? "oklch(72% 0.1 190 / 0.09)" : RAISE;
              const sf = fainted ? "grayscale(1) opacity(0.45)" : benched ? "grayscale(1) opacity(0.3)" : activeAt >= 0 ? "none" : "saturate(0.75) opacity(0.85)";
              return (
                <button key={tslug} title={benched ? `${nameOf(tslug)} — not brought (four already sent out)` : activeAt >= 0 ? `${nameOf(tslug)} — on the field${on ? " (shown below)" : ", click to show"}` : `Switch in ${nameOf(tslug)}`}
                  onClick={() => {
                    if (activeAt >= 0) { focus(side, activeAt as 0 | 1); }
                    else if (!benched) {
                      const next = [...active] as [string, string]; next[idx] = tslug;
                      (foe ? setActiveOpp : setActiveUser)(next);
                      (foe ? setSentOpp : setSentUser)([...new Set([...sent, tslug])]);
                    }
                  }}
                  style={{ position: "relative", flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, borderRadius: 9, border: `1px solid ${tborder}`, background: tbg, padding: "3px 1px 4px", cursor: "pointer" }}>
                  <Sprite species={tslug} w={40} h={30} filter={sf} />
                  <span style={{ width: 34, height: 4, borderRadius: 2, background: "oklch(30% 0.01 240)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${tst.hpPct}%`, background: hpColor(tst.hpPct) }} /></span>
                  {activeAt >= 0 && !fainted && <span title="on the field" style={{ position: "absolute", top: 3, right: 3, width: 8, height: 8, borderRadius: 999, background: on ? ACC : "oklch(62% 0.07 190)", boxShadow: "0 0 0 2px oklch(20% 0.008 240)" }} />}
                  {fainted && <span title="fainted" style={{ position: "absolute", top: 1, right: 4, fontSize: 11, fontWeight: 800, lineHeight: 1, color: "oklch(68% 0.16 25)" }}>✕</span>}
                  {!fainted && tst.status !== "none" && <span title={tst.status} style={{ position: "absolute", bottom: 1, left: 2, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 14, height: 14, padding: "0 2px", borderRadius: 999, fontSize: 8, fontWeight: 800, lineHeight: 1, background: STATUS_COLOR[tst.status] ?? "transparent", color: "#fff" }}>{STATUS_GLYPH[tst.status] ?? ""}</span>}
                </button>
              );
            })}
          </span>
        </div>

        {/* identity row */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <Sprite species={slug} w={50} h={38} scale={1.25} />
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>{forme ? forme.name : p.name}</span>
          <span style={{ display: "flex", gap: 4 }}>
            {typesFor(forme ? forme.types : p.types).map((t) => <span key={t.name} style={{ borderRadius: 999, fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", padding: "2px 7px", color: "#fff", background: t.hex }}>{t.name}</span>)}
          </span>
          <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 3 }}>
            {STATUSES.map((x) => {
              const on = st.status === x;
              return <button key={x} onClick={() => patchMon(side, slug, { status: on ? "none" : x })} title={on ? `Clear ${x}` : `Set ${x}`} style={{ borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", border: `1px solid ${on ? STATUS_COLOR[x] : "oklch(32% 0.01 240)"}`, cursor: "pointer", background: on ? STATUS_COLOR[x] : "transparent", color: on ? "#fff" : "oklch(62% 0.012 240)" }}>{STATUS_SHORT[x]}</button>;
            })}
          </span>
          {mega && (
            <button onClick={() => { if (mega && !megaBlocked) patchMon(side, slug, isMega ? { mega: false } : { mega: true, item: mega.item, itemUsed: false }); }} title={isMega ? `Revert ${mega.name}` : megaBlocked ? "Only one Mega Evolution per team" : `Mega Evolve (${mega.name}, ${mega.item})`} style={{ marginLeft: "auto", borderRadius: 9, padding: "3px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer", opacity: megaBlocked ? 0.4 : 1, border: `1px solid ${isMega ? "#c026d3" : "rgba(232,121,249,0.55)"}`, background: isMega ? "#c026d3" : "transparent", color: isMega ? "#0e1013" : "#e879f9" }}>Mega</button>
          )}
        </div>

        {/* HP row */}
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span className="mono" style={{ fontSize: 11, color: "oklch(78% 0.01 240)", width: 38 }}>{st.hpPct}%</span>
          <input type="range" min={0} max={100} value={st.hpPct} onChange={(e) => patchMon(side, slug, { hpPct: Number(e.target.value) })} style={{ flex: 1, minWidth: 0 }} />
        </div>

        {/* ability + item */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 6 }}>
          <select value={abilityValue} disabled={abilityLocked} onChange={(e) => patchMon(side, slug, { ability: e.target.value })} aria-label="Ability" style={{ borderRadius: 9, height: 30, border: "1px solid oklch(32% 0.01 240)", background: "oklch(24% 0.008 240)", color: "oklch(90% 0.01 240)", padding: "0 8px", fontSize: 11, opacity: abilityLocked ? 0.7 : 1 }}>
            {abilityOpts.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <span style={{ position: "relative", display: "block", minWidth: 0 }}>
            <button onClick={() => { setItemPicker(itemsOpen ? null : side); setItemQuery(""); }} title="Item" disabled={isMega} style={{ width: "100%", borderRadius: 9, height: 30, border: "1px solid oklch(32% 0.01 240)", background: "oklch(24% 0.008 240)", color: "oklch(90% 0.01 240)", padding: "0 20px 0 8px", fontSize: 11, cursor: isMega ? "default" : "pointer", textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{itemValue}</button>
            <span style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", fontSize: 9, pointerEvents: "none", color: "oklch(66% 0.012 240)" }}>▾</span>
            {itemsOpen && !isMega && (
              <span style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)", zIndex: 20, display: "flex", flexDirection: "column", gap: 4, borderRadius: 10, border: "1px solid oklch(32% 0.01 240)", background: "oklch(20% 0.008 240)", boxShadow: "0 16px 34px rgba(0,0,0,0.5)", padding: 7 }}>
                <input value={itemQuery} onChange={(e) => setItemQuery(e.target.value)} placeholder="Search items…" style={{ borderRadius: 7, height: 26, border: "1px solid oklch(30% 0.01 240)", background: "oklch(16% 0.008 240)", color: "oklch(92% 0.01 240)", padding: "0 8px", fontSize: 11 }} />
                <span style={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 168, overflowY: "auto" }}>
                  {itemList.map((it) => { const on = it === st.item; return (
                    <button key={it} onClick={() => { patchMon(side, slug, { item: it }); setItemPicker(null); setItemQuery(""); }} style={{ textAlign: "left", border: "none", borderRadius: 6, background: on ? "oklch(72% 0.1 190 / 0.16)" : "transparent", color: on ? "oklch(86% 0.1 190)" : "oklch(88% 0.01 240)", padding: "4px 7px", fontSize: 11, cursor: "pointer" }}>{it}</button>
                  ); })}
                </span>
              </span>
            )}
          </span>
        </div>

        {/* species specials */}
        {(slug === "ditto" || slug === "zoroark" || (slug === "dondozo" && team.some((x) => x === "tatsugiri"))) && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            {slug === "dondozo" && team.some((x) => x === "tatsugiri") && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "oklch(80% 0.09 235)" }}><input type="checkbox" checked={!!st.commander} onChange={(e) => patchMon(side, slug, { commander: e.target.checked })} /> Commander (+2 all)</label>
            )}
            {slug === "ditto" && (
              <select value={st.transformInto ?? ""} onChange={(e) => patchMon(side, slug, { transformInto: e.target.value || null })} style={{ borderRadius: 8, height: 28, border: "1px solid oklch(60% 0.12 235)", background: "oklch(24% 0.008 240)", color: "oklch(82% 0.09 235)", padding: "0 8px", fontSize: 10 }}>
                <option value="">Transform into…</option>
                {foesActive.map((x) => <option key={x} value={x}>{nameOf(x)}</option>)}
              </select>
            )}
            {slug === "zoroark" && (
              <select value={st.illusionAs ?? ""} onChange={(e) => patchMon(side, slug, { illusionAs: e.target.value || null })} style={{ borderRadius: 8, height: 28, border: "1px solid #a21caf", background: "oklch(24% 0.008 240)", color: "#f0abfc", padding: "0 8px", fontSize: 10 }}>
                <option value="">Illusion (disguise)…</option>
                {team.filter((x) => x !== slug).map((x) => <option key={x} value={x}>{nameOf(x)}</option>)}
              </select>
            )}
          </div>
        )}

        {/* moves */}
        <div style={{ borderTop: "1px solid oklch(28% 0.01 240)", paddingTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
            <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "oklch(54% 0.012 240)" }}>{foe ? `Their moves vs ${targetName}` : `Moves vs ${targetName}`}</span>
            <span style={{ display: "flex", gap: 4 }}>
              {foesActive.map((tslug, i) => { const on = tgtIdx === i; return (
                <button key={tslug} onClick={() => setTarget({ ...target, [slug]: i as 0 | 1 })} title={`Damage vs ${nameOf(tslug)}`} style={{ display: "flex", alignItems: "center", borderRadius: 8, border: `1px solid ${on ? ACC : "oklch(30% 0.01 240)"}`, background: on ? "oklch(72% 0.1 190 / 0.14)" : RAISE, padding: "1px 3px", cursor: "pointer" }}>
                  <Sprite species={tslug} w={36} h={27} filter={on ? undefined : "opacity(0.5)"} />
                </button>
              ); })}
            </span>
          </div>
          {foe && <p style={{ margin: "0 0 6px", fontSize: 10, lineHeight: 1.45, color: "oklch(56% 0.012 240)" }}>Likely moves from ladder usage. Click a move once to add it to their known set, again to clear.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {(attacker?.moves ?? []).map((m) => renderMoveRow(side, slug, m, attacker!, targetC, defenderConditions, field, order, moveState, known, tgtIdx))}
          </div>
        </div>

        {/* spread & boosts */}
        <div style={{ borderTop: "1px solid oklch(28% 0.01 240)", paddingTop: 9 }}>
          <button onClick={() => setSpreadOpen(!spreadOpen)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "oklch(54% 0.012 240)" }}>{spreadOpen ? "Spread & boosts ▴" : "Spread & boosts ▾"}</button>
          {spreadOpen && (
            <table style={{ width: "100%", tableLayout: "fixed", textAlign: "center", fontSize: 11, borderCollapse: "collapse", marginTop: 8 }}>
              <thead>
                <tr style={{ fontSize: 9, textTransform: "uppercase", color: "oklch(54% 0.012 240)" }}>
                  <th style={{ textAlign: "left", fontWeight: 500, width: 34 }}> </th>
                  {statHeads.map((h) => <th key={h.label} style={{ fontWeight: 700, color: h.color }}>{h.label}</th>)}
                </tr>
              </thead>
              <tbody className="mono">
                <tr>
                  <td style={{ textAlign: "left", color: "oklch(54% 0.012 240)", fontSize: 9 }}>BASE</td>
                  {STAT_KEYS.map((k) => <td key={k} style={{ color: "oklch(70% 0.01 240)" }}>{baseStats[k]}</td>)}
                </tr>
                <tr>
                  <td style={{ textAlign: "left", color: "oklch(54% 0.012 240)", fontSize: 9 }}>EV</td>
                  {STAT_KEYS.map((k) => (
                    <td key={k}><input type="number" min={0} max={252} step={4} value={st.evs[k] ?? 0} onChange={(e) => patchMon(side, slug, { evs: { ...st.evs, [k]: Math.max(0, Math.min(252, Number(e.target.value))) } })} style={{ width: "100%", maxWidth: 42, borderRadius: 6, border: "1px solid oklch(30% 0.01 240)", background: "oklch(16% 0.008 240)", color: "oklch(88% 0.01 240)", textAlign: "center", fontSize: 10, padding: "2px 0" }} /></td>
                  ))}
                </tr>
                <tr>
                  <td style={{ textAlign: "left", color: "oklch(54% 0.012 240)", fontSize: 9 }}>=</td>
                  {STAT_KEYS.map((k) => <td key={k} style={{ fontWeight: 700, color: "oklch(92% 0.004 240)" }}>{attacker ? attacker.stats[k] : "-"}</td>)}
                </tr>
                <tr>
                  <td style={{ textAlign: "left", color: "oklch(54% 0.012 240)", fontSize: 9 }}>STAGE</td>
                  <td style={{ color: "oklch(40% 0.01 240)" }}>-</td>
                  {(["atk", "def", "spa", "spd", "spe"] as const).map((k) => (
                    <td key={k}>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                        <button onClick={() => patchMon(side, slug, { stages: { ...st.stages, [k]: Math.max(-6, st.stages[k] - 1) } })} style={{ border: "none", background: "oklch(30% 0.01 240)", color: "oklch(88% 0.01 240)", borderRadius: 4, width: 14, height: 14, fontSize: 9, lineHeight: 1, cursor: "pointer" }}>−</button>
                        <span style={{ width: 15, textAlign: "center", fontSize: 10, color: st.stages[k] > 0 ? POS : st.stages[k] < 0 ? NEG : T2 }}>{st.stages[k] > 0 ? `+${st.stages[k]}` : `${st.stages[k]}`}</span>
                        <button onClick={() => patchMon(side, slug, { stages: { ...st.stages, [k]: Math.min(6, st.stages[k] + 1) } })} style={{ border: "none", background: "oklch(30% 0.01 240)", color: "oklch(88% 0.01 240)", borderRadius: 4, width: 14, height: 14, fontSize: 9, lineHeight: 1, cursor: "pointer" }}>+</button>
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  function renderMoveRow(
    side: Side, slug: string, m: MoveFixture, attacker: Combatant, targetC: Combatant | null,
    defenderConditions: SideConditions, field: FieldState,
    order: Order | undefined, moveState: Record<string, "set">, known: string[], tgtIdx: 0 | 1,
  ) {
    const foe = side === "opponent";
    const isDmg = m.category !== "status" && m.power !== null && !!targetC;
    const d = isDmg ? calculateDamage(attacker, targetC!, m, field, { defenderConditions, spread: m.target !== "normal", crit: false }) : null;
    const ko = koText(d);
    const barPct = d ? Math.min(100, d.expectedPercent) : 0;
    const barColor = barPct >= 60 ? POS : barPct >= 35 ? WARN : "oklch(50% 0.03 240)";
    const chosen = !foe && !!order && order.move === m.name && order.target === tgtIdx;
    const inSet = foe && (moveState[m.name] === "set" || known.includes(m.name));
    const rowBg = chosen ? "oklch(72% 0.1 190 / 0.14)" : inSet ? "oklch(68% 0.16 25 / 0.1)" : RAISE;
    const border = chosen ? ACC : inSet ? "oklch(68% 0.16 25 / 0.5)" : "oklch(28% 0.01 240)";
    const nameColor = inSet ? "oklch(86% 0.09 25)" : "oklch(92% 0.01 240)";
    const nameWeight = chosen || inSet ? 800 : 600;
    const label = foe ? `${inSet ? "✓" : "○"} ${m.name}` : m.name;
    const hasFlag = chosen || inSet;
    const statLine = `${m.power ? m.power : "—"} bp · ${m.accuracy != null ? m.accuracy + "%" : "—"}`;
    const onClick = () => {
      if (foe) {
        const nextSet = moveState[m.name] === "set" || known.includes(m.name) ? undefined : "set";
        const ms = { ...moveState };
        if (nextSet) ms[m.name] = nextSet; else delete ms[m.name];
        patchMon(side, slug, { moveState: ms, knownMoves: nextSet ? [...new Set([...known, m.name])] : known.filter((x) => x !== m.name) });
      } else {
        setOrders((prev) => ({ ...prev, [selUser]: { move: m.name, target: tgtIdx, slug } }));
      }
    };
    return (
      <button key={m.name} onClick={onClick} title={foe ? (inSet ? "In their set — click to remove" : "Click to add to their known set") : `Order ${m.name} this round`} style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", textAlign: "left", cursor: "pointer", borderRadius: 10, border: `1px solid ${border}`, background: rowBg, padding: "7px 9px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ borderRadius: 5, padding: "1px 6px", fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#fff", background: TYPE_HEX[m.type] ?? "#777" }}>{m.type.slice(0, 3)}</span>
          <span style={{ fontSize: 12, fontWeight: nameWeight, color: nameColor, flex: 1, minWidth: 0 }}>{label}</span>
          {hasFlag && <span style={{ flexShrink: 0, borderRadius: 5, background: chosen ? ACC : NEG, color: chosen ? BG : "#fff", fontSize: 8, fontWeight: 800, textTransform: "uppercase", padding: "1px 5px" }}>{chosen ? "chosen" : "in set"}</span>}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="mono" style={{ fontSize: 10, color: "oklch(58% 0.012 240)", flex: "0 0 92px" }}>{statLine}</span>
          <span style={{ flex: 1, minWidth: 24, height: 5, borderRadius: 3, background: "oklch(30% 0.01 240)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${barPct}%`, background: barColor }} /></span>
          <span className="mono" style={{ fontSize: 10, color: "oklch(76% 0.01 240)", flex: "0 0 62px", textAlign: "right" }}>{d ? `${d.minPercent}–${d.maxPercent}%` : "-"}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: ko.color, flex: "0 0 66px", textAlign: "right" }}>{ko.text}</span>
        </span>
      </button>
    );
  }
}

const STAT_LABEL: Record<StatKey, string> = { hp: "HP", atk: "ATK", def: "DEF", spa: "SPA", spd: "SPD", spe: "SPE" };

// ---- ranked option (nested details inside the best-play card) -------------

function RankedOption({ r, i, border, rankBg, bar, scoreColor }: { r: Recommendation; i: number; border: string; rankBg: string; bar: string; scoreColor: string }) {
  const scorePct = Math.round(r.breakdown.total * 100);
  const factors = [...r.breakdown.factors].sort((a, b) => b.contribution - a.contribution);
  return (
    <details style={{ borderRadius: 12, border: `1px solid ${border}`, background: "oklch(20% 0.008 240)" }}>
      <summary style={{ listStyle: "none", cursor: "pointer", padding: "11px 13px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ borderRadius: 6, background: rankBg, color: "oklch(16% 0.008 240)", fontWeight: 800, fontSize: 10, padding: "2px 7px", flexShrink: 0 }}>#{i + 1}</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700 }}>{r.actionLines.join(" · ")}</span>
        <span style={{ flex: "0 0 78px", height: 5, borderRadius: 3, background: "oklch(30% 0.01 240)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${scorePct}%`, background: bar }} /></span>
        <span className="mono" style={{ flex: "0 0 46px", textAlign: "right", fontSize: 11, color: scoreColor }}>{r.breakdown.total.toFixed(3)}</span>
        <span style={{ flex: "0 0 74px", textAlign: "right", fontSize: 10, color: "oklch(54% 0.012 240)" }}>conf {(r.confidence * 100).toFixed(0)}%</span>
      </summary>
      <div style={{ padding: "0 13px 13px", display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ margin: 0, fontSize: 12, color: "oklch(80% 0.01 240)", lineHeight: 1.5 }}>{r.expectedPosition}</p>
        {r.damage.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3, fontSize: 11, color: "oklch(64% 0.012 240)" }}>
            {r.damage.map((d, k) => (
              <li key={k}>{d.attacker} → {d.target} ({d.moveName}): {d.damage.minPercent}–{d.damage.maxPercent}% (exp {d.damage.expectedPercent}%), OHKO {(d.damage.ohkoProbability * 100).toFixed(0)}%, 2HKO {d.damage.twoHitKoProbability === null ? "-" : (d.damage.twoHitKoProbability * 100).toFixed(0)}%, {d.movesFirst ? "moves first" : "moves second"}</li>
            ))}
          </ul>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {factors.map((f) => <span key={f.name} title={`raw ${f.raw}, weight ${f.weight}`} style={{ borderRadius: 6, background: "oklch(26% 0.008 240)", color: "oklch(78% 0.01 240)", padding: "2px 8px", fontSize: 10 }}>{f.name}: {f.contribution.toFixed(3)}</span>)}
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "oklch(68% 0.16 25)" }}>Risk: {r.mainRisk}</p>
        <p style={{ margin: 0, fontSize: 11, color: "oklch(56% 0.012 240)", lineHeight: 1.5 }}>{r.explanation}</p>
        <details>
          <summary style={{ cursor: "pointer", fontSize: 11, color: "oklch(56% 0.012 240)" }}>Assumptions</summary>
          <ul style={{ margin: "5px 0 0", paddingLeft: 16, fontSize: 11, color: "oklch(56% 0.012 240)", display: "flex", flexDirection: "column", gap: 3 }}>
            {assumptionsFor(r.assumptions).map((a) => <li key={a.id}>{a.description}</li>)}
          </ul>
        </details>
      </div>
    </details>
  );
}

export { BattleView };
