"use client";

// Pokémon Showdown-style team view: a tab bar (Team + one tab per Pokémon) over
// a stack of editable Pokémon cards. Slice B covers the card layout + inline
// editing (nickname, level, item, ability, moves, nature) + add/remove + save.
// Rich searchable item/move/ability lists (with a Popular section) and the
// slider EV/IV editor arrive in slices C and D; the click-to-edit seams are here.

import { useMemo, useState, useTransition } from "react";
import { PokeIcon } from "@/components/PokeIcon";
import { Picker, type Option } from "@/components/teams/Picker";
import { EvIvEditor } from "@/components/teams/EvIvEditor";
import { saveTeamSnapshotAction } from "@/app/teams/actions";
import { STAT_KEYS, type PokemonSet, type StatKey } from "@/domain/types/pokemon";

export interface MemberRef {
  name: string;
  abilities: string[];
  legalMoves: string[];
  baseStats: Record<StatKey, number>;
}

interface PopEntry {
  name: string;
  pct: number;
}
export interface TournamentPopular {
  items: PopEntry[];
  abilities: PopEntry[];
  moves: PopEntry[];
}

/** Join key to tournament data (matches @pkmn id): "Rotom-Heat" → "rotomheat". */
const uKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const asPopular = (e: PopEntry[] = []): Option[] =>
  e.map((x) => ({ name: x.name, desc: `${x.pct}%` }));

const STAT_LABELS: Record<StatKey, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

const zeroEvs = (): Record<StatKey, number> =>
  Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Record<StatKey, number>;
const maxIvs = (): Record<StatKey, number> =>
  Object.fromEntries(STAT_KEYS.map((k) => [k, 31])) as Record<StatKey, number>;

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

function statBarColor(v: number): string {
  if (v < 60) return "bg-red-500";
  if (v < 80) return "bg-yellow-500";
  if (v < 100) return "bg-green-500";
  if (v < 130) return "bg-green-700";
  return "bg-sky-400";
}

export function TeamBuilder({
  teamId,
  isBox,
  initialMembers,
  refs,
  pool,
  natures,
  items,
  abilityDesc,
  moveDesc,
  tournament = {},
}: {
  teamId: string;
  isBox: boolean;
  initialMembers: PokemonSet[];
  refs: Record<string, MemberRef>;
  pool: { slug: string; name: string }[];
  natures: string[];
  items: Option[];
  abilityDesc: Record<string, string>;
  moveDesc: Record<string, string>;
  tournament?: Record<string, TournamentPopular>;
}) {
  const [members, setMembers] = useState<PokemonSet[]>(initialMembers);
  const [tab, setTab] = useState<"team" | number>("team");
  const [spreadFor, setSpreadFor] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const limit = isBox ? 60 : 6;

  const refOf = (species: string): MemberRef =>
    refs[species] ?? {
      name: species,
      abilities: [],
      legalMoves: [],
      baseStats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    };

  const update = (i: number, patch: Partial<PokemonSet>) => {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
    setDirty(true);
  };

  const addMember = (slug: string) => {
    if (!slug || members.length >= limit) return;
    const r = refOf(slug);
    setMembers((prev) => [
      ...prev,
      {
        species: slug,
        level: 50,
        ability: r.abilities[0] ?? null,
        item: null,
        nature: "Serious",
        moves: r.legalMoves.slice(0, 4),
        spread: { ivs: maxIvs(), evs: zeroEvs() },
      },
    ]);
    setDirty(true);
  };

  const removeMember = (i: number) => {
    setMembers((prev) => prev.filter((_, idx) => idx !== i));
    if (typeof tab === "number" && tab >= i) setTab("team");
    setDirty(true);
  };

  const save = () => {
    startTransition(async () => {
      const msg = await saveTeamSnapshotAction(
        fd({ teamId, snapshot: JSON.stringify({ members }) }),
      );
      setStatus(msg);
      setDirty(false);
    });
  };

  const shown = useMemo(
    () => (tab === "team" ? members.map((_, i) => i) : [tab as number]),
    [tab, members],
  );

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 pb-2">
        <button
          onClick={() => setTab("team")}
          className={`rounded px-3 py-1 text-sm font-medium ${
            tab === "team" ? "bg-amber-500 text-black" : "bg-slate-800 hover:bg-slate-700"
          }`}
        >
          {isBox ? "Box" : "Team"} ({members.length})
        </button>
        {members.map((m, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-sm ${
              tab === i ? "bg-amber-500 text-black" : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            <PokeIcon species={m.species} />
            <span className="max-w-[6rem] truncate">{refOf(m.species).name}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {status && <span className="text-xs text-emerald-400">{status}</span>}
          <button
            onClick={save}
            disabled={!dirty || pending}
            className="rounded bg-emerald-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-40 hover:bg-emerald-500"
          >
            {pending ? "Saving…" : dirty ? "Save version" : "Saved"}
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {shown.map((i) => {
          const m = members[i]!;
          const r = refOf(m.species);
          const tm = tournament[uKey(m.species)];
          return (
            <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PokeIcon species={m.species} />
                  <input
                    value={m.nickname ?? ""}
                    onChange={(e) => update(i, { nickname: e.target.value || undefined })}
                    placeholder={r.name}
                    className="w-40 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm font-semibold"
                  />
                  <span className="text-xs text-slate-500">{r.name}</span>
                </div>
                <button
                  onClick={() => removeMember(i)}
                  className="rounded bg-slate-800 px-2 py-1 text-xs text-rose-300 hover:bg-slate-700"
                >
                  Delete
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                {/* Details */}
                <div className="space-y-1 text-xs">
                  <span className="font-semibold uppercase text-slate-500">Details</span>
                  <label className="flex items-center justify-between gap-2">
                    Level
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={m.level}
                      onChange={(e) =>
                        update(i, {
                          level: Math.max(1, Math.min(100, Number(e.target.value) || 1)),
                        })
                      }
                      className="w-16 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-right"
                    />
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <span>Item</span>
                    <div className="w-32">
                      <Picker
                        value={m.item}
                        options={items}
                        onSelect={(v) => update(i, { item: v })}
                        allowClear
                        label="items"
                        popular={asPopular(tm?.items)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Ability</span>
                    <div className="w-32">
                      <Picker
                        value={m.ability}
                        options={(r.abilities.length
                          ? r.abilities
                          : m.ability
                            ? [m.ability]
                            : []
                        ).map((a) => ({ name: a, desc: abilityDesc[a] }))}
                        onSelect={(v) => update(i, { ability: v })}
                        label="abilities"
                        popular={asPopular(tm?.abilities)}
                      />
                    </div>
                  </div>
                  <label className="flex items-center justify-between gap-2">
                    Nature
                    <select
                      value={m.nature}
                      onChange={(e) => update(i, { nature: e.target.value })}
                      className="w-28 rounded border border-slate-700 bg-slate-900 px-1 py-0.5"
                    >
                      {natures.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Moves */}
                <div className="space-y-1 text-xs md:col-span-2">
                  <span className="font-semibold uppercase text-slate-500">Moves</span>
                  {[0, 1, 2, 3].map((mi) => {
                    const moveOpts: Option[] = r.legalMoves.map((mv) => ({
                      name: mv,
                      desc: moveDesc[mv],
                    }));
                    return (
                      <Picker
                        key={mi}
                        value={m.moves[mi] ?? null}
                        options={moveOpts}
                        onSelect={(v) => {
                          const moves = [...m.moves];
                          if (v) moves[mi] = v;
                          else moves.splice(mi, 1);
                          update(i, { moves: moves.filter(Boolean) });
                        }}
                        allowClear
                        placeholder="— (empty)"
                        label="moves"
                        popular={asPopular(tm?.moves)}
                      />
                    );
                  })}
                </div>

                {/* Stats (base + EV points; slider editor in slice D) */}
                <div className="space-y-0.5 text-xs">
                  <span className="font-semibold uppercase text-slate-500">Stats</span>
                  {STAT_KEYS.map((k) => (
                    <div key={k} className="flex items-center gap-1">
                      <span className="w-8 text-slate-400">{STAT_LABELS[k]}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
                        <span
                          className={`block h-full ${statBarColor(r.baseStats[k])}`}
                          style={{ width: `${Math.min(100, (r.baseStats[k] / 255) * 100)}%` }}
                        />
                      </span>
                      <span className="w-8 text-right tabular-nums text-slate-500">
                        {m.spread.evs[k] || "—"}
                      </span>
                    </div>
                  ))}
                  <button
                    onClick={() => setSpreadFor(spreadFor === i ? null : i)}
                    className="mt-1 w-full rounded bg-slate-800 px-2 py-1 text-[11px] hover:bg-slate-700"
                  >
                    {spreadFor === i ? "Hide EV/IV" : "⚙ Edit EV/IV"}
                  </button>
                </div>
              </div>

              {spreadFor === i && (
                <EvIvEditor
                  base={r.baseStats}
                  spread={m.spread}
                  level={m.level}
                  nature={m.nature}
                  natures={natures}
                  onChange={(s) => update(i, { spread: s })}
                  onNature={(n) => update(i, { nature: n })}
                />
              )}
            </div>
          );
        })}

        {members.length === 0 && (
          <p className="text-sm text-slate-500">No Pokémon yet — add one below.</p>
        )}
      </div>

      {/* Add member */}
      {members.length < limit && (
        <div className="flex items-center gap-2">
          <select
            defaultValue=""
            onChange={(e) => {
              addMember(e.target.value);
              e.currentTarget.value = "";
            }}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
          >
            <option value="">＋ Add Pokémon…</option>
            {pool.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500">
            {members.length}/{limit}
          </span>
        </div>
      )}
    </div>
  );
}
