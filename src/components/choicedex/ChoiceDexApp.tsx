"use client";

import { useMemo, useState } from "react";
import { Recommendations } from "./Recommendations";
import { analyzeLeads } from "@/domain/choicedex/leads";
import { recommend } from "@/domain/choicedex/recommend";
import { DEFAULT_FIELD, type StatusCondition, type Terrain, type Weather } from "@/domain/types/battle";
import type { PokemonType } from "@/domain/types/pokemon";
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

interface ActiveState {
  slug: string | null;
  hpPct: number;
  status: StatusCondition;
  ability: string;
  item: string;
}
const emptyActive = (): ActiveState => ({ slug: null, hpPct: 100, status: "none", ability: "", item: "None" });

function BattleView({
  bySlug,
  userTeam,
  oppTeam,
  onBack,
}: {
  bySlug: Map<string, PokemonRef>;
  userTeam: string[];
  oppTeam: string[];
  onBack: () => void;
}) {
  const refBySlug = bySlug;
  const [round, setRound] = useState(1);
  const [user, setUser] = useState<[ActiveState, ActiveState]>([
    { ...emptyActive(), slug: userTeam[0] ?? null },
    { ...emptyActive(), slug: userTeam[1] ?? null },
  ]);
  const [opp, setOpp] = useState<[ActiveState, ActiveState]>([
    { ...emptyActive(), slug: oppTeam[0] ?? null },
    { ...emptyActive(), slug: oppTeam[1] ?? null },
  ]);
  const [weather, setWeather] = useState<Weather>("none");
  const [terrain, setTerrain] = useState<Terrain>("none");
  const [trickRoom, setTrickRoom] = useState(false);
  const [uCond, setUCond] = useState({ tailwind: false, reflect: false, lightScreen: false, auroraVeil: false });
  const [oCond, setOCond] = useState({ tailwind: false, reflect: false, lightScreen: false, auroraVeil: false });

  const patch = (side: Side, idx: 0 | 1, p: Partial<ActiveState>) => {
    const setter = side === "user" ? setUser : setOpp;
    setter((a) => {
      const next = [...a] as [ActiveState, ActiveState];
      next[idx] = { ...next[idx], ...p };
      return next;
    });
  };

  const toSlot = (a: ActiveState): SlotForm => ({
    ...emptySlot(a.slug ?? ""),
    hpPct: a.hpPct,
    status: a.status,
    ability: a.ability,
    item: a.item,
  });

  const built = useMemo(() => {
    if (!user[0].slug || !user[1].slug || !opp[0].slug || !opp[1].slug) return null;
    const side = (a: [ActiveState, ActiveState], c: typeof uCond): SideForm => ({
      slots: [toSlot(a[0]), toSlot(a[1])],
      ...c,
    });
    const form: TurnForm = {
      user: side(user, uCond),
      opponent: side(opp, oCond),
      weather,
      terrain,
      trickRoom,
      note: "",
    };
    return buildStateWithEntry(form, refBySlug);
  }, [user, opp, weather, terrain, trickRoom, uCond, oCond, refBySlug]);

  const recommendations = useMemo(
    () => (built?.state ? recommend(built.state, { limit: 6 }) : []),
    [built],
  );

  const abilitiesFor = (slug: string | null) => (slug ? refBySlug.get(slug)?.abilities ?? [] : []);
  const teamOptions = (team: string[]) => team.map((s) => ({ slug: s, name: refBySlug.get(s)?.name ?? s }));

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
            {[0, 1].map((i) => (
              <ActiveCard
                key={i}
                label="Opp"
                foe
                state={opp[i as 0 | 1]}
                options={teamOptions(oppTeam)}
                abilities={abilitiesFor(opp[i as 0 | 1].slug)}
                onPatch={(p) => patch("opponent", i as 0 | 1, p)}
              />
            ))}
          </div>
          <div className="absolute bottom-3 left-3 flex gap-2">
            {[0, 1].map((i) => (
              <ActiveCard
                key={i}
                label="You"
                state={user[i as 0 | 1]}
                options={teamOptions(userTeam)}
                abilities={abilitiesFor(user[i as 0 | 1].slug)}
                onPatch={(p) => patch("user", i as 0 | 1, p)}
              />
            ))}
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
        </div>
      </div>

      {/* Move panels (Showdown-style, below the screen) */}
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1].map((i) => {
          const a = user[i as 0 | 1];
          const ref = a.slug ? refBySlug.get(a.slug) : undefined;
          return (
            <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                {ref?.name ?? "—"} moves
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(ref?.moves ?? []).slice(0, 4).map((m) => (
                  <div key={m.name} className="rounded border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs">
                    <span className="font-medium">{m.name}</span>
                    <span className="ml-1 text-slate-500">{m.power ?? "—"}</span>
                  </div>
                ))}
                {(!ref || ref.moves.length === 0) && <span className="text-xs text-slate-600">no move data</span>}
              </div>
            </div>
          );
        })}
      </div>

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
  state,
  options,
  abilities,
  onPatch,
}: {
  label: string;
  foe?: boolean;
  state: ActiveState;
  options: { slug: string; name: string }[];
  abilities: string[];
  onPatch: (p: Partial<ActiveState>) => void;
}) {
  return (
    <div className={`w-36 rounded-lg border p-2 text-xs backdrop-blur ${foe ? "border-rose-800/60 bg-slate-900/70" : "border-emerald-800/60 bg-slate-900/70"}`}>
      <span className="mb-1 block text-[10px] uppercase text-slate-500">{label}</span>
      <select
        value={state.slug ?? ""}
        onChange={(e) => onPatch({ slug: e.target.value || null })}
        className="mb-1 w-full rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs"
      >
        <option value="">—</option>
        {options.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
      </select>
      <label className="flex items-center gap-1">
        HP
        <input
          type="range" min={0} max={100} value={state.hpPct}
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
          value={state.ability || abilities[0]}
          onChange={(e) => onPatch({ ability: e.target.value })}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs"
        >
          {abilities.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      )}
      <select
        value={state.item}
        onChange={(e) => onPatch({ item: e.target.value })}
        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs"
      >
        {COMMON_ITEMS.map((it) => <option key={it} value={it}>{it}</option>)}
      </select>
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
