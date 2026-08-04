"use client";

// Pokémon Showdown-style team view: a tab bar (Team + one tab per Pokémon) over
// a stack of editable Pokémon cards. Slice B covers the card layout + inline
// editing (nickname, level, item, ability, moves, nature) + add/remove + save.
// Rich searchable item/move/ability lists (with a Popular section) and the
// slider EV/IV editor arrive in slices C and D; the click-to-edit seams are here.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PokeIcon } from "@/components/PokeIcon";
import { ItemIcon } from "@/components/ItemIcon";
import { TypeBadge } from "@/components/ui";
import { type Option } from "@/components/teams/SelectorPanel";
import { SelectorPanel } from "@/components/teams/SelectorPanel";
import { EvIvEditor } from "@/components/teams/EvIvEditor";
import { statColor } from "@/domain/mechanics/statColor";
import { saveTeamSnapshotAction } from "@/app/teams/actions";
import {
  STAT_KEYS,
  STAT_LABELS,
  type PokemonSet,
  type PokemonType,
  type StatKey,
} from "@/domain/types/pokemon";

export type MoveCategory = "physical" | "special" | "status";
export interface MoveMeta {
  type: PokemonType;
  category: MoveCategory;
  power: number | null;
}

export interface MemberRef {
  name: string;
  types: PokemonType[];
  abilities: string[];
  legalMoves: string[];
  baseStats: Record<StatKey, number>;
}

const CAT_ABBR: Record<MoveCategory, string> = {
  physical: "Phys",
  special: "Spec",
  status: "Sta",
};
const CAT_COLOR: Record<MoveCategory, string> = {
  physical: "bg-red-800 text-red-100",
  special: "bg-indigo-800 text-indigo-100",
  status: "bg-slate-700 text-slate-200",
};

function MoveTag({ meta }: { meta?: MoveMeta }) {
  if (!meta) return null;
  return (
    <span className="flex items-center gap-1">
      <TypeBadge type={meta.type} />
      <span className={`rounded px-1 text-[9px] font-semibold uppercase ${CAT_COLOR[meta.category]}`}>
        {CAT_ABBR[meta.category]}
      </span>
      {meta.power != null && (
        <span className="text-[10px] tabular-nums text-slate-400">{meta.power}</span>
      )}
    </span>
  );
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

type PanelKind = "item" | "ability" | "species" | "spread" | `move${number}`;

/** Join key to tournament data (matches @pkmn id): "Rotom-Heat" → "rotomheat". */
const uKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const asPopular = (e: PopEntry[] = []): Option[] =>
  e.map((x) => ({ name: x.name, desc: `${x.pct}%` }));

const zeroEvs = (): Record<StatKey, number> =>
  Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Record<StatKey, number>;
const maxIvs = (): Record<StatKey, number> =>
  Object.fromEntries(STAT_KEYS.map((k) => [k, 31])) as Record<StatKey, number>;

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
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
  moveMeta = {},
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
  moveMeta?: Record<string, MoveMeta>;
  tournament?: Record<string, TournamentPopular>;
}) {
  const [members, setMembers] = useState<PokemonSet[]>(initialMembers);
  const [tab, setTab] = useState<"team" | number>("team");
  // One inline panel open at a time. member -1 = "add Pokémon".
  const [panel, setPanel] = useState<{ member: number; kind: PanelKind } | null>(null);
  const openPanel = (member: number, kind: PanelKind) =>
    setPanel((p) => (p && p.member === member && p.kind === kind ? null : { member, kind }));
  const closePanel = () => setPanel(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const limit = isBox ? 60 : 6;

  const refOf = (species: string): MemberRef =>
    refs[species] ?? {
      name: species,
      types: [],
      abilities: [],
      legalMoves: [],
      baseStats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    };

  const update = (i: number, patch: Partial<PokemonSet>) => {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
    setDirty(true);
  };

  // Auto-fill a new member from the highest-rated meta set where available:
  // popular item/ability/moves from tournament data, plus a standard offensive
  // EV spread + nature inferred from the species' better attacking stat.
  const defaultSet = (slug: string): PokemonSet => {
    const r = refOf(slug);
    const tm = tournament[uKey(slug)];

    const ability = tm?.abilities[0]?.name ?? r.abilities[0] ?? null;
    const item = tm?.items[0]?.name ?? null;

    const legal = new Set(r.legalMoves);
    const popularMoves = (tm?.moves ?? [])
      .map((x) => x.name)
      .filter((n) => legal.has(n));
    const moves = (popularMoves.length ? popularMoves : r.legalMoves).slice(0, 4);

    // Offensive spread: max the better attacking stat + Speed, boosting nature.
    const physical = (r.baseStats.atk ?? 0) >= (r.baseStats.spa ?? 0);
    const evs = zeroEvs();
    evs[physical ? "atk" : "spa"] = 252;
    evs.spe = 252;
    evs.hp = 4;
    const ivs = maxIvs();
    if (!physical) ivs.atk = 0; // special attacker: minimise Foul Play / confusion
    const nature = physical ? "Adamant" : "Modest";

    return {
      species: slug,
      level: 50,
      ability,
      item,
      nature,
      moves,
      spread: { ivs, evs },
    };
  };

  const addMember = (slug: string) => {
    if (!slug || members.length >= limit) return;
    setMembers((prev) => [...prev, defaultSet(slug)]);
    setDirty(true);
  };

  // Change a member's species, keeping display bits (nickname/level/nature/spread)
  // and resetting ability + moves to the new species' legal defaults.
  const changeSpecies = (i: number, slug: string) => {
    if (!slug) return;
    setMembers((prev) =>
      prev.map((m, idx) => {
        if (idx !== i) return m;
        // Full meta auto-fill for the new species; keep only nickname + level.
        const base = defaultSet(slug);
        return { ...base, nickname: m.nickname, level: m.level };
      }),
    );
    setDirty(true);
  };

  const removeMember = (i: number) => {
    setMembers((prev) => prev.filter((_, idx) => idx !== i));
    if (typeof tab === "number" && tab >= i) setTab("team");
    setDirty(true);
  };

  // Autosave: debounce after edits and flush on exit (unmount / tab hide).
  const membersRef = useRef(members);
  membersRef.current = members;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const flush = useCallback(() => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    setDirty(false);
    setSaving(true);
    saveTeamSnapshotAction(fd({ teamId, snapshot: JSON.stringify({ members: membersRef.current }) }))
      .then((msg) => setStatus(msg))
      .catch(() => setStatus("Save failed"))
      .finally(() => setSaving(false));
  }, [teamId]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(flush, 1200);
    return () => clearTimeout(t);
  }, [members, dirty, flush]);

  useEffect(() => {
    const onHide = () => flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      flush(); // save on unmount (navigating away)
    };
  }, [flush]);

  const shown = useMemo(
    () => (tab === "team" ? members.map((_, i) => i) : [tab as number]),
    [tab, members],
  );

  // Species options for the change/add panels: name-keyed, mapped back to slug.
  const poolOptions = useMemo<Option[]>(() => pool.map((p) => ({ name: p.name })), [pool]);
  const slugByName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of pool) map[p.name] = p.slug;
    return map;
  }, [pool]);

  const setMove = (i: number, mi: number, v: string | null) => {
    const moves = [...members[i]!.moves];
    if (v) moves[mi] = v;
    else moves.splice(mi, 1);
    update(i, { moves: moves.filter(Boolean) });
  };

  function renderPanel(
    i: number,
    m: PokemonSet,
    r: MemberRef,
    tm: TournamentPopular | undefined,
  ) {
    const kind = panel!.kind;
    if (kind === "spread") {
      return (
        <EvIvEditor
          base={r.baseStats}
          spread={m.spread}
          level={m.level}
          nature={m.nature}
          natures={natures}
          onChange={(s) => update(i, { spread: s })}
          onNature={(n) => update(i, { nature: n })}
        />
      );
    }
    if (kind === "item") {
      return (
        <SelectorPanel
          title="Item"
          options={items}
          popular={asPopular(tm?.items)}
          value={m.item}
          allowClear
          leading={(o) => <ItemIcon item={o.name} />}
          onSelect={(v) => update(i, { item: v })}
          onClose={closePanel}
        />
      );
    }
    if (kind === "ability") {
      const opts = (r.abilities.length ? r.abilities : m.ability ? [m.ability] : []).map(
        (a) => ({ name: a, desc: abilityDesc[a] }),
      );
      return (
        <SelectorPanel
          title="Ability"
          options={opts}
          popular={asPopular(tm?.abilities)}
          value={m.ability}
          onSelect={(v) => update(i, { ability: v })}
          onClose={closePanel}
        />
      );
    }
    if (kind === "species") {
      return (
        <SelectorPanel
          title="Change Pokémon"
          options={poolOptions}
          value={r.name}
          onSelect={(v) => v && changeSpecies(i, slugByName[v] ?? "")}
          onClose={closePanel}
        />
      );
    }
    const mi = Number(kind.slice(4));
    return (
      <SelectorPanel
        title={`Move ${mi + 1}`}
        options={r.legalMoves.map((mv) => ({ name: mv, desc: moveDesc[mv] }))}
        popular={asPopular(tm?.moves)}
        value={m.moves[mi] ?? null}
        allowClear
        leading={(o) => <MoveTag meta={moveMeta[o.name]} />}
        onSelect={(v) => setMove(i, mi, v)}
        onClose={closePanel}
      />
    );
  }

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
            onClick={() => {
              setTab(i);
              // Fold out the first move selector immediately on selecting a mon.
              setPanel({ member: i, kind: "move0" });
            }}
            className={`flex items-center gap-1 rounded px-2 py-1 text-sm ${
              tab === i ? "bg-amber-500 text-black" : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            <PokeIcon species={m.species} />
            <span className="max-w-[6rem] truncate">{refOf(m.species).name}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className={dirty || saving ? "text-slate-400" : "text-emerald-400"}>
            {saving ? "Saving…" : dirty ? "Unsaved changes" : status || "All changes saved"}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {shown.map((i) => {
          const m = members[i]!;
          const r = refOf(m.species);
          const tm = tournament[uKey(m.species)];
          return (
            <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PokeIcon species={m.species} />
                  <input
                    value={m.nickname ?? ""}
                    onChange={(e) => update(i, { nickname: e.target.value || undefined })}
                    placeholder={r.name}
                    className="w-40 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm font-semibold"
                  />
                  <button
                    onClick={() => openPanel(i, "species")}
                    className="rounded px-1 text-xs text-amber-400 underline decoration-dotted hover:text-amber-300"
                    title="Change Pokémon"
                  >
                    {r.name} ✎
                  </button>
                  <span className="flex gap-1">
                    {r.types.map((t) => <TypeBadge key={t} type={t} />)}
                  </span>
                </div>
                <button
                  onClick={() => removeMember(i)}
                  className="rounded bg-slate-800 px-2 py-1 text-xs text-rose-300 hover:bg-slate-700"
                >
                  Delete
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-4">
                {/* Details */}
                <div className="space-y-2 text-xs">
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
                    <button
                      onClick={() => openPanel(i, "item")}
                      className="flex w-32 items-center gap-1 truncate rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-left hover:border-amber-500"
                    >
                      {m.item ? (
                        <>
                          <ItemIcon item={m.item} />
                          <span className="truncate">{m.item}</span>
                        </>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Ability</span>
                    <button
                      onClick={() => openPanel(i, "ability")}
                      className="w-32 truncate rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-left hover:border-amber-500"
                    >
                      {m.ability || <span className="text-slate-600">—</span>}
                    </button>
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
                    const mv = m.moves[mi];
                    return (
                      <button
                        key={mi}
                        onClick={() => openPanel(i, `move${mi}`)}
                        className="flex w-full items-center justify-between gap-2 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-left hover:border-amber-500"
                      >
                        <span className="truncate">
                          {mv || <span className="text-slate-600">— (empty)</span>}
                        </span>
                        {mv && <MoveTag meta={moveMeta[mv]} />}
                      </button>
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
                          className="block h-full"
                          style={{
                            width: `${Math.min(100, (r.baseStats[k] / 255) * 100)}%`,
                            backgroundColor: statColor(r.baseStats[k]),
                          }}
                        />
                      </span>
                      <span className="w-8 text-right tabular-nums text-slate-500">
                        {m.spread.evs[k] || "—"}
                      </span>
                    </div>
                  ))}
                  <button
                    onClick={() => openPanel(i, "spread")}
                    className="mt-1 w-full rounded bg-slate-800 px-2 py-1 text-[11px] hover:bg-slate-700"
                  >
                    {panel?.member === i && panel.kind === "spread"
                      ? "Hide EV/IV"
                      : "⚙ Edit EV/IV"}
                  </button>
                </div>
              </div>

              {panel?.member === i && renderPanel(i, m, r, tm)}
            </div>
          );
        })}

        {members.length === 0 && (
          <p className="text-sm text-slate-500">No Pokémon yet — add one below.</p>
        )}
      </div>

      {/* Add member — searchable panel */}
      {members.length < limit && (
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openPanel(-1, "species")}
              className="rounded bg-amber-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-amber-400"
            >
              ＋ Add Pokémon
            </button>
            <span className="text-xs text-slate-500">
              {members.length}/{limit}
            </span>
          </div>
          {panel?.member === -1 && panel.kind === "species" && (
            <SelectorPanel
              title="Add Pokémon"
              options={poolOptions}
              onSelect={(v) => v && addMember(slugByName[v] ?? "")}
              onClose={closePanel}
            />
          )}
        </div>
      )}

      {/* Extra bottom whitespace so an open panel never sits against the edge. */}
      <div className="h-32" />
    </div>
  );
}
