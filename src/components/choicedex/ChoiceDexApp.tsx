"use client";

import { useMemo, useState } from "react";
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

export interface SavedTeam {
  id: string;
  name: string;
  members: string[]; // species slugs
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
});

function BattleView({
  bySlug,
  allAbilities,
  userTeam,
  oppTeam,
  onBack,
}: {
  bySlug: Map<string, PokemonRef>;
  allAbilities: string[];
  userTeam: string[];
  oppTeam: string[];
  onBack: () => void;
}) {
  const refBySlug = bySlug;
  const [round, setRound] = useState(1);
  // Which team member occupies each of the two active spots per side.
  const [activeUser, setActiveUser] = useState<[string | null, string | null]>([
    userTeam[0] ?? null,
    userTeam[1] ?? null,
  ]);
  const [activeOpp, setActiveOpp] = useState<[string | null, string | null]>([
    oppTeam[0] ?? null,
    oppTeam[1] ?? null,
  ]);
  // Per-Pokémon battle state, keyed by species slug, so HP/status/item/ability
  // persist across switches — exactly as a Pokémon keeps them in a real battle.
  const [mon, setMon] = useState<Record<string, MonState>>(() => {
    const init: Record<string, MonState> = {};
    for (const s of [...userTeam, ...oppTeam]) init[s] = emptyMon();
    return init;
  });
  const [weather, setWeather] = useState<Weather>("none");
  const [terrain, setTerrain] = useState<Terrain>("none");
  const [trickRoom, setTrickRoom] = useState(false);
  const [uCond, setUCond] = useState({ tailwind: false, reflect: false, lightScreen: false, auroraVeil: false });
  const [oCond, setOCond] = useState({ tailwind: false, reflect: false, lightScreen: false, auroraVeil: false });

  const monOf = (slug: string | null): MonState => (slug && mon[slug]) || emptyMon();
  const patchMon = (slug: string | null, p: Partial<MonState>) => {
    if (!slug) return;
    setMon((m) => ({ ...m, [slug]: { ...(m[slug] ?? emptyMon()), ...p } }));
  };
  const setActive = (side: Side, idx: 0 | 1, slug: string | null) =>
    (side === "user" ? setActiveUser : setActiveOpp)((a) => {
      const next = [...a] as [string | null, string | null];
      next[idx] = slug;
      return next;
    });

  const toSlot = (slug: string): SlotForm => {
    const s = monOf(slug);
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

  const built = useMemo(() => {
    const [u0, u1] = activeUser;
    const [o0, o1] = activeOpp;
    if (!u0 || !u1 || !o0 || !o1) return null;
    const side = (slugs: [string, string], c: typeof uCond): SideForm => ({
      slots: [toSlot(slugs[0]), toSlot(slugs[1])],
      ...c,
    });
    const form: TurnForm = {
      user: side([u0, u1], uCond),
      opponent: side([o0, o1], oCond),
      weather,
      terrain,
      trickRoom,
      note: "",
    };
    return buildStateWithEntry(form, refBySlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUser, activeOpp, mon, weather, terrain, trickRoom, uCond, oCond, refBySlug]);

  const recommendations = useMemo(
    () => (built?.state ? recommend(built.state, { limit: 6 }) : []),
    [built],
  );

  const abilitiesFor = (slug: string | null) => (slug ? refBySlug.get(slug)?.abilities ?? [] : []);
  // Legal options for a spot: the side's team minus whoever is in the OTHER spot
  // (a Pokémon can't be in both active spots at once).
  const optionsFor = (team: string[], active: [string | null, string | null], idx: 0 | 1) => {
    const sibling = active[idx === 0 ? 1 : 0];
    return team
      .filter((s) => s !== sibling)
      .map((s) => ({ slug: s, name: refBySlug.get(s)?.name ?? s }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-amber-400 hover:underline">← Team preview</button>
        <span className="text-xs uppercase tracking-wide text-slate-500">Round {round}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Battle screen: opponent top-right, you bottom-left */}
        <div className="relative min-h-[240px] overflow-hidden rounded-lg border border-slate-800 bg-gradient-to-b from-sky-900/30 to-emerald-900/20 p-3">
          <div className="absolute right-3 top-3 flex gap-2">
            {[0, 1].map((i) => {
              const slug = activeOpp[i as 0 | 1];
              return (
                <ActiveCard
                  key={i}
                  label="Opp"
                  foe
                  slug={slug}
                  state={monOf(slug)}
                  options={optionsFor(oppTeam, activeOpp, i as 0 | 1)}
                  abilities={allAbilities}
                  defaultAbility={abilitiesFor(slug)[0] ?? ""}
                  onSelect={(s) => setActive("opponent", i as 0 | 1, s)}
                  onPatch={(p) => patchMon(slug, p)}
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
                  state={monOf(slug)}
                  options={optionsFor(userTeam, activeUser, i as 0 | 1)}
                  abilities={allAbilities}
                  defaultAbility={abilitiesFor(slug)[0] ?? ""}
                  onSelect={(s) => setActive("user", i as 0 | 1, s)}
                  onPatch={(p) => patchMon(slug, p)}
                />
              );
            })}
          </div>
        </div>

        {/* Tools */}
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-300">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Field &amp; tools</h3>
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
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={trickRoom} onChange={(e) => setTrickRoom(e.target.checked)} /> Trick Room
          </label>
          <ConditionRow label="Your side" cond={uCond} onChange={setUCond} />
          <ConditionRow label="Opponent side" cond={oCond} onChange={setOCond} />

          <div className="border-t border-slate-800 pt-2">
            <p className="mb-1 text-[10px] uppercase text-slate-500">Battle moves</p>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => allySwitch("user")} className="rounded border border-slate-700 px-2 py-0.5 hover:border-amber-500">
                Ally Switch (you)
              </button>
              <button onClick={() => allySwitch("opponent")} className="rounded border border-slate-700 px-2 py-0.5 hover:border-amber-500">
                Ally Switch (opp)
              </button>
            </div>
            <p className="mt-1 text-[10px] leading-snug text-slate-600">
              Switch moves (Volt Switch, U-turn, Roar, Whirlwind, Dragon Tail,
              Parting Shot): change that spot&apos;s Pokémon above. Ability moves
              (Skill Swap, Simple Beam, Worry Seed, Entrainment, Gastro Acid): set
              the new ability on a card. Item used up: tick “used”.
            </p>
          </div>
        </div>
      </div>

      {/* Showdex-style detail panels: per-move damage/KO + full stat table */}
      {built?.state && (
        <div className="grid gap-3 md:grid-cols-2">
          {([
            { key: "u0", slug: activeUser[0], attacker: built.state.user.active[0], enemies: built.state.opponent, foe: false },
            { key: "u1", slug: activeUser[1], attacker: built.state.user.active[1], enemies: built.state.opponent, foe: false },
            { key: "o0", slug: activeOpp[0], attacker: built.state.opponent.active[0], enemies: built.state.user, foe: true },
            { key: "o1", slug: activeOpp[1], attacker: built.state.opponent.active[1], enemies: built.state.user, foe: true },
          ] as const).map((spec) => {
            const ref = spec.slug ? refBySlug.get(spec.slug) : undefined;
            if (!ref || !spec.attacker || !spec.slug) return null;
            const targets = spec.enemies.active
              .filter((c): c is Combatant => c !== null)
              .map((c) => ({ name: c.name, combatant: c }));
            return (
              <MonPanel
                key={spec.key}
                name={ref.name}
                types={ref.types}
                baseStats={ref.baseStats}
                attacker={spec.attacker}
                targets={targets}
                abilities={allAbilities}
                defaultAbility={abilitiesFor(spec.slug)[0] ?? ""}
                field={built.state.field}
                defenderConditions={spec.enemies.conditions}
                state={monOf(spec.slug)}
                onPatch={(p) => patchMon(spec.slug, p)}
                foe={spec.foe}
              />
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Enter the round&apos;s HP/status/field above, then advance.
        </p>
        <button
          onClick={() => setRound((r) => r + 1)}
          className="rounded bg-amber-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-amber-400"
        >
          Next round →
        </button>
      </div>

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
  return (
    <div className={`w-36 rounded-lg border p-2 text-xs backdrop-blur ${foe ? "border-rose-800/60 bg-slate-900/70" : "border-emerald-800/60 bg-slate-900/70"}`}>
      <span className="mb-1 block text-[10px] uppercase text-slate-500">{label}</span>
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
        {COMMON_ITEMS.map((it) => <option key={it} value={it}>{it}</option>)}
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
  cond: { tailwind: boolean; reflect: boolean; lightScreen: boolean; auroraVeil: boolean };
  onChange: (c: typeof cond) => void;
}) {
  const items: [keyof typeof cond, string][] = [
    ["tailwind", "Tailwind"],
    ["reflect", "Reflect"],
    ["lightScreen", "Light Screen"],
    ["auroraVeil", "Aurora Veil"],
  ];
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map(([k, lbl]) => (
          <label key={k} className="flex items-center gap-1">
            <input type="checkbox" checked={cond[k]} onChange={(e) => onChange({ ...cond, [k]: e.target.checked })} />
            {lbl}
          </label>
        ))}
      </div>
    </div>
  );
}
