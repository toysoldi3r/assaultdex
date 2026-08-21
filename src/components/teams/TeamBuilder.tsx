"use client";

// Redesigned teambuilder: a 320px team-sheet rail (completeness matrix + flags)
// beside the builder column (tab bar → overview grid or a member card). Legality
// is relaxed for this format - a held item and a full four moves are optional,
// so their absence shows as advisory flags, never errors.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PokeIcon } from "@/components/PokeIcon";
import { ItemIcon } from "@/components/ItemIcon";
import { CategoryIcon } from "@/components/CategoryIcon";
import { TypeBadge, TYPE_HEX } from "@/components/ui";
import { type Option, SelectorPanel } from "@/components/teams/SelectorPanel";
import { MoveSelectorPanel, type MoveRow } from "@/components/teams/MoveSelectorPanel";
import type { MoveMeta } from "@/components/teams/moveTypes";
import { EvIvEditor, StatBar } from "@/components/teams/EvIvEditor";
import { NATURES } from "@/data/fixtures/natures";
import { suggestSets } from "@/data/suggestSets";
import { computeStat } from "@/domain/mechanics/stats";
import { saveTeamSnapshotAction } from "@/app/teams/actions";
import {
  STAT_KEYS,
  STAT_LABELS,
  type PokemonSet,
  type PokemonType,
  type StatKey,
} from "@/domain/types/pokemon";

export type { MoveMeta } from "@/components/teams/moveTypes";

export interface MemberRef {
  name: string;
  types: PokemonType[];
  abilities: string[];
  legalMoves: string[];
  baseStats: Record<StatKey, number>;
}

interface PopEntry { name: string; pct: number }
export interface TournamentPopular {
  items: PopEntry[];
  abilities: PopEntry[];
  moves: PopEntry[];
}

type PanelKind = "item" | "ability" | "species" | `move${number}`;

const uKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const asPopular = (e: PopEntry[] = []): Option[] => e.map((x) => ({ name: x.name, desc: `${x.pct}%` }));
const zeroEvs = (): Record<StatKey, number> =>
  Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Record<StatKey, number>;
const maxIvs = (): Record<StatKey, number> =>
  Object.fromEntries(STAT_KEYS.map((k) => [k, 31])) as Record<StatKey, number>;

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

const evTotalOf = (m: PokemonSet) => STAT_KEYS.reduce((s, k) => s + (m.spread.evs[k] || 0), 0);
const isLegal = (m: PokemonSet) => !!m.ability && m.moves.filter(Boolean).length >= 1;

// Shared column template for the move rows so the name, type, category and
// power/accuracy line up in columns across all four slots.
const MOVE_COLS = "1fr 58px 20px 84px";

// Common held items, in rough competitive priority, used only as a last-resort
// ladder so the item-clause auto-pick can hand each new member a distinct item
// when there is no per-species usage data to rank from.
const GENERIC_ITEMS = [
  "Life Orb", "Leftovers", "Focus Sash", "Choice Specs", "Choice Band",
  "Choice Scarf", "Assault Vest", "Sitrus Berry", "Rocky Helmet", "Expert Belt",
  "Safety Goggles", "Mystic Water",
];

export function TeamBuilder({
  teamId,
  teamName,
  isBox,
  initialMembers,
  refs,
  pool,
  natures,
  items,
  abilityDesc,
  moveMeta = {},
  tournament = {},
}: {
  teamId: string;
  teamName?: string;
  isBox: boolean;
  initialMembers: PokemonSet[];
  refs: Record<string, MemberRef>;
  pool: { slug: string; name: string }[];
  natures: string[];
  items: Option[];
  abilityDesc: Record<string, string>;
  moveMeta?: Record<string, MoveMeta>;
  tournament?: Record<string, TournamentPopular>;
}) {
  const [members, setMembers] = useState<PokemonSet[]>(initialMembers);
  const [tab, setTab] = useState<"team" | "add" | number>("team");
  const [panel, setPanel] = useState<{ member: number; kind: PanelKind } | null>(null);
  const openPanel = (member: number, kind: PanelKind) =>
    setPanel((p) => (p && p.member === member && p.kind === kind ? null : { member, kind }));
  const closePanel = () => setPanel(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [flagsOpen, setFlagsOpen] = useState(true);
  const limit = isBox ? 60 : 6;

  const refOf = (species: string): MemberRef =>
    refs[species] ?? { name: species, types: [], abilities: [], legalMoves: [], baseStats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } };

  const update = (i: number, patch: Partial<PokemonSet>) => {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
    setDirty(true);
  };

  const moveLikeOf = (r: MemberRef) =>
    r.legalMoves.map((n) => ({
      name: n,
      type: moveMeta[n]?.type ?? null,
      category: moveMeta[n]?.category ?? ("status" as const),
      power: moveMeta[n]?.power ?? null,
    }));
  const suggestionsOf = (r: MemberRef) => suggestSets(r.types, r.baseStats, r.abilities, moveLikeOf(r));

  const defaultSet = (slug: string, usedItems: Set<string> = new Set()): PokemonSet => {
    const r = refOf(slug);
    const tm = tournament[uKey(slug)];
    const suggestions = suggestionsOf(r);
    // Pick the archetype that fits the species instead of always the first
    // (offensive) one, so the default item varies across the roster rather than
    // defaulting every Pokémon to the offensive set's Life Orb.
    const bulky = (r.baseStats.hp ?? 0) >= 90 && Math.max(r.baseStats.def ?? 0, r.baseStats.spd ?? 0) >= 90;
    const suggestion =
      (bulky && suggestions.find((s) => s.label === "Bulky attacker" || s.label === "Balanced")) ||
      suggestions[0];
    const ability = tm?.abilities[0]?.name ?? suggestion?.ability ?? r.abilities[0] ?? null;
    // Held item, most-popular first: tournament usage for this species (ranked
    // by share), then the suggested-set items as a fallback. The item clause
    // forbids two Pokémon holding the same item, so skip anything already on the
    // team and drop to the next most popular; only if every candidate is taken
    // do we fall back to the single most popular (flagged as a duplicate).
    const itemRanked = [
      ...(tm?.items ?? []).map((x) => x.name),
      suggestion?.item,
      ...suggestions.map((s) => s.item),
      // Broad fallback ladder of common legal items, so the item-clause skip
      // below can still find a distinct item when there's no per-species usage
      // data and the suggested-set items are all taken (otherwise every added
      // Pokémon defaults to the same Life Orb).
      ...GENERIC_ITEMS,
    ].filter((n): n is string => Boolean(n));
    const item =
      itemRanked.find((n) => !usedItems.has(n)) ?? itemRanked[0] ?? null;
    const legal = new Set(r.legalMoves);
    const popularMoves = (tm?.moves ?? []).map((x) => x.name).filter((n) => legal.has(n));
    const moves = (popularMoves.length ? popularMoves : suggestion?.moves ?? r.legalMoves.slice(0, 4)).slice(0, 4);
    const evs = { ...zeroEvs(), ...(suggestion?.evs ?? {}) };
    const ivs = { ...maxIvs(), ...(suggestion?.ivs ?? {}) };
    const nature = suggestion?.nature ?? "Serious";
    return { species: slug, level: 50, ability, item, nature, moves, spread: { ivs, evs } };
  };

  const addMember = (slug: string) => {
    if (!slug || members.length >= limit) return;
    setMembers((prev) => {
      const usedItems = new Set(prev.map((m) => m.item).filter((i): i is string => Boolean(i)));
      const next = [...prev, defaultSet(slug, usedItems)];
      setTab(next.length - 1);
      return next;
    });
    setDirty(true);
    setPanel(null);
  };

  const changeSpecies = (i: number, slug: string) => {
    if (!slug) return;
    setMembers((prev) => {
      const usedItems = new Set(
        prev.filter((_, idx) => idx !== i).map((m) => m.item).filter((it): it is string => Boolean(it)),
      );
      return prev.map((m, idx) =>
        idx !== i ? m : { ...defaultSet(slug, usedItems), nickname: m.nickname, level: m.level },
      );
    });
    setDirty(true);
  };

  const removeMember = (i: number) => {
    setMembers((prev) => prev.filter((_, idx) => idx !== i));
    if (typeof tab === "number" && tab >= i) setTab("team");
    setPanel(null);
    setDirty(true);
  };

  const setMove = (i: number, mi: number, v: string | null) => {
    const moves = [...members[i]!.moves];
    if (v) moves[mi] = v;
    else moves.splice(mi, 1);
    update(i, { moves: moves.filter(Boolean) });
  };

  // Autosave.
  const membersRef = useRef(members); membersRef.current = members;
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty;
  const flush = useCallback(() => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    setDirty(false);
    setSaving(true);
    saveTeamSnapshotAction(fd({ teamId, snapshot: JSON.stringify({ members: membersRef.current }) }))
      .then(() => setSavedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })))
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
    return () => { window.removeEventListener("pagehide", onHide); flush(); };
  }, [flush]);

  const poolOptions = useMemo<Option[]>(() => pool.map((p) => ({ name: p.name })), [pool]);
  const slugByName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of pool) map[p.name] = p.slug;
    return map;
  }, [pool]);

  // Item clause: no two Pokémon may hold the same item. Members sharing an item
  // are marked illegal (both the offender and the earlier holder).
  const dupItemIdx = useMemo(() => {
    const seen = new Map<string, number>();
    const dup = new Set<number>();
    members.forEach((m, i) => {
      if (!m.item) return;
      const prev = seen.get(m.item);
      if (prev !== undefined) { dup.add(i); dup.add(prev); }
      else seen.set(m.item, i);
    });
    return dup;
  }, [members]);

  const memberLegal = (i: number) => isLegal(members[i]!) && !dupItemIdx.has(i);

  // Advisory flags, recomputed from live state.
  const flags = useMemo(() => {
    const out: { i: number; kind: "Warning" | "Note"; text: string }[] = [];
    members.forEach((m, i) => {
      const name = refOf(m.species).name;
      if (!m.item) out.push({ i, kind: "Note", text: `${name} holds no item (optional in this format).` });
      else if (dupItemIdx.has(i)) out.push({ i, kind: "Warning", text: `${name} holds ${m.item}, which another Pokémon also holds - duplicate items are illegal.` });
      const ev = evTotalOf(m);
      if (ev < 508) out.push({ i, kind: "Warning", text: `${name} has ${508 - ev} EVs unspent.` });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, dupItemIdx]);

  const savedLabel = saving ? "Saving…" : dirty ? "Unsaved…" : savedAt ?? "-";
  const completeCount = members.filter((m, i) => memberLegal(i) && !!m.item && evTotalOf(m) === 508).length;

  // -- picker for a member card --------------------------------------------
  function renderPanel(i: number, m: PokemonSet, r: MemberRef, tm: TournamentPopular | undefined) {
    const kind = panel!.kind;
    const forLabel = `for ${r.name}`;
    // Suggested-set items/moves float to the top as "recommended" even when
    // there is no tournament usage, ahead of the full alphabetical list.
    const suggestions = suggestionsOf(r);
    if (kind === "item") {
      const tmItems = asPopular(tm?.items);
      const seen = new Set(tmItems.map((o) => o.name));
      const recItems = [...new Set(suggestions.map((s) => s.item).filter(Boolean))]
        .filter((n) => !seen.has(n))
        .map((n) => ({ name: n, desc: "suggested" }));
      return (
        <SelectorPanel
          key={`item-${i}`} title="Item" forLabel={forLabel} options={items} popular={[...tmItems, ...recItems]}
          value={m.item} clearLabel={m.item ? "No item - a held item is optional in this format." : undefined}
          leading={(o) => <ItemIcon item={o.name} />}
          onSelect={(v) => update(i, { item: v })} onClose={closePanel}
        />
      );
    }
    if (kind === "ability") {
      const opts = (r.abilities.length ? r.abilities : m.ability ? [m.ability] : []).map((a) => ({ name: a, desc: abilityDesc[a] }));
      return (
        <SelectorPanel key={`ability-${i}`} title="Ability" forLabel={forLabel} options={opts} popular={asPopular(tm?.abilities)}
          value={m.ability} onSelect={(v) => update(i, { ability: v })} onClose={closePanel} />
      );
    }
    if (kind === "species") {
      return (
        <SelectorPanel key={`species-${i}`} title="Change Pokémon" forLabel={forLabel} options={poolOptions} value={r.name}
          onSelect={(v) => v && changeSpecies(i, slugByName[v] ?? "")} onClose={closePanel} />
      );
    }
    const mi = Number(kind.slice(4));
    const rows: MoveRow[] = r.legalMoves.map((mv) => ({ name: mv, meta: moveMeta[mv] }));
    const legalSet = new Set(r.legalMoves);
    const tmMoves: MoveRow[] = (tm?.moves ?? []).map((x) => ({ name: x.name, meta: moveMeta[x.name], pct: `${x.pct}%` }));
    const seenMoves = new Set(tmMoves.map((x) => x.name));
    const recMoves: MoveRow[] = [...new Set(suggestions.flatMap((s) => s.moves))]
      .filter((n) => legalSet.has(n) && !seenMoves.has(n))
      .map((n) => ({ name: n, meta: moveMeta[n] }));
    const pop: MoveRow[] = [...tmMoves, ...recMoves];
    const otherMoves = m.moves.filter((_, idx) => idx !== mi);
    return (
      <MoveSelectorPanel
        key={`move-${i}-${mi}`} title={`Move ${mi + 1}`} forLabel={forLabel} rows={rows} popular={pop}
        value={m.moves[mi] ?? null} exclude={otherMoves}
        clearLabel={m.moves[mi] ? "Empty this slot - three moves are legal." : undefined}
        onSelect={(v) => setMove(i, mi, v)} onClose={closePanel}
      />
    );
  }

  // -- one member card -----------------------------------------------------
  function memberCard(i: number) {
    const m = members[i]!;
    const r = refOf(m.species);
    const tm = tournament[uKey(m.species)];
    return (
      <div className="overflow-hidden rounded-lg border border-line bg-panel">
        {/* Identity row */}
        <div className="flex flex-wrap items-start gap-4 px-[14px] py-[10px]">
          <span className="grid h-[58px] w-[58px] shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-bg">
            <PokeIcon species={m.species} className="scale-[1.8]" />
          </span>
          <div className="flex flex-col gap-1">
            <button onClick={() => openPanel(i, "species")} title="Change Pokémon"
              className="w-[210px] rounded border border-line bg-bg px-2 py-1 text-left hover:border-accln">
              <span className="text-[14px] font-[650] text-t1">{r.name}</span>
              <span className="ml-1 text-[10px] text-t3">change</span>
            </button>
            <span className="flex gap-1">{r.types.map((t) => <TypeBadge key={t} type={t} />)}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Field label="Item">
              <button onClick={() => openPanel(i, "item")}
                title={dupItemIdx.has(i) ? "Duplicate item - another Pokémon holds this too (illegal)." : undefined}
                className={`flex w-[170px] items-center gap-1.5 rounded px-2 py-1 text-[13px] ${
                  dupItemIdx.has(i) ? "border border-neg bg-bg text-neg" : m.item ? "border border-line bg-bg" : "border border-dashed border-line bg-bg text-t3"}`}>
                {m.item ? <ItemIcon item={m.item} /> : null}
                <span className="truncate">{m.item ?? "No item"}</span>
              </button>
            </Field>
            <Field label="Ability">
              <button onClick={() => openPanel(i, "ability")}
                className="w-[170px] truncate rounded border border-line bg-bg px-2 py-1 text-left text-[13px] hover:border-accln">
                {m.ability || <span className="text-t3">-</span>}
              </button>
            </Field>
          </div>
        </div>

        {/* Details row */}
        <div className="flex flex-wrap items-end gap-3 border-b border-line px-[14px] pb-[10px]">
          <Field label="Nickname">
            <input value={m.nickname ?? ""} onChange={(e) => update(i, { nickname: e.target.value || undefined })}
              placeholder={r.name} className="w-[170px] rounded border border-line bg-bg px-2 py-1 text-[13px]" />
          </Field>
          <Field label="Level">
            <span title="Every battle is set to level 50" className="inline-block rounded bg-raise px-3 py-1 text-[13px] text-t3">50</span>
          </Field>
          <Field label="Gender">
            <select value={m.gender ?? ""} onChange={(e) => update(i, { gender: (e.target.value || undefined) as "M" | "F" | undefined })}
              className="w-[96px] rounded border border-line bg-bg px-2 py-1 text-[13px]">
              <option value="">-</option><option value="M">♂ M</option><option value="F">♀ F</option>
            </select>
          </Field>
          <Field label="Shiny">
            <select value={m.shiny ? "yes" : "no"} onChange={(e) => update(i, { shiny: e.target.value === "yes" })}
              className="w-[96px] rounded border border-line bg-bg px-2 py-1 text-[13px]">
              <option value="no">No</option><option value="yes">Yes</option>
            </select>
          </Field>
        </div>

        {/* Body: moves | stats */}
        <div className="grid md:grid-cols-2">
          <div className="space-y-1.5 border-line px-[14px] py-[10px] md:border-r">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-t3">Moves</span>
            <div className="grid items-center gap-2 pl-3 pr-7 text-[9px] uppercase tracking-wide text-t3" style={{ gridTemplateColumns: MOVE_COLS }}>
              <span>Move</span>
              <span>Type</span>
              <span>Cat</span>
              <span className="text-right">Pow · Acc</span>
            </div>
            {[0, 1, 2, 3].map((mi) => {
              const mv = m.moves[mi];
              const meta = mv ? moveMeta[mv] : undefined;
              const stripe = meta ? TYPE_HEX[meta.type] : "transparent";
              return (
                <div key={mi}
                  className={`relative flex items-center overflow-hidden rounded ${
                    mv ? "border border-line bg-bg" : "border border-dashed border-line bg-bg"}`}>
                  <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: stripe }} />
                  <button onClick={() => openPanel(i, `move${mi}`)}
                    className="grid min-w-0 flex-1 items-center gap-2 py-1.5 pl-3 pr-1 text-left"
                    style={{ gridTemplateColumns: MOVE_COLS }}>
                    {mv ? (
                      <>
                        <span className="truncate text-[13px] text-t1">{mv}</span>
                        <span>{meta ? <TypeBadge type={meta.type} /> : null}</span>
                        <span>{meta ? <CategoryIcon category={meta.category} /> : null}</span>
                        <span className="text-right text-[10px] tabular-nums text-t3">
                          {!meta || meta.category === "status"
                            ? "status"
                            : `${meta.power ?? "-"} · ${meta.accuracy == null ? "-" : `${meta.accuracy}%`}`}
                        </span>
                      </>
                    ) : (
                      <span className="col-span-4 text-[13px] text-t3">Empty slot - optional</span>
                    )}
                  </button>
                  {mv && (
                    <button onClick={() => setMove(i, mi, null)} title="Remove move"
                      className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] text-t3 hover:text-neg">
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-[18px] py-[14px]">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-t3">Base stats &amp; EVs</span>
            <EvIvEditor base={r.baseStats} spread={m.spread} level={m.level} nature={m.nature} natures={natures}
              onChange={(s) => update(i, { spread: s })} onNature={(n) => update(i, { nature: n })} />
          </div>
        </div>

        {panel?.member === i && (
          <div className="border-t border-line bg-bg px-[18px] py-[14px]">{renderPanel(i, m, r, tm)}</div>
        )}
      </div>
    );
  }

  // -- overview grid card --------------------------------------------------
  function overviewCard(i: number) {
    const m = members[i]!;
    const r = refOf(m.species);
    const nat = NATURES[m.nature] ?? NATURES.Serious!;
    const ev = evTotalOf(m);
    const legal = memberLegal(i);
    const open = flags.some((f) => f.i === i);
    return (
      <button key={i} onClick={() => setTab(i)}
        className={`rounded-lg bg-panel p-3 text-left ${open ? "border border-warn" : "border border-line"}`}>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden"><PokeIcon species={m.species} className="scale-125" /></span>
          <span className="text-[13px] font-[600] text-t1">{r.name}</span>
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: legal ? "var(--pos)" : "var(--warn)" }} />
          <span className="ml-auto flex gap-1">{r.types.map((t) => <TypeBadge key={t} type={t} />)}</span>
        </div>
        <div className="mt-2 grid gap-3.5 md:grid-cols-2">
          <ul className="space-y-0.5">
            {[0, 1, 2, 3].map((mi) => {
              const mv = m.moves[mi];
              const meta = mv ? moveMeta[mv] : undefined;
              return (
                <li key={mi} className="flex items-center gap-1.5 text-[11.5px]">
                  <span className="h-[11px] w-[3px] shrink-0 rounded-sm" style={{ background: meta ? TYPE_HEX[meta.type] : "var(--line)" }} />
                  <span className={mv ? "text-t2" : "text-t3"}>{mv ?? "empty slot"}</span>
                </li>
              );
            })}
          </ul>
          <div className="w-[148px] space-y-0.5">
            {STAT_KEYS.map((k) => (
              <div key={k} className="grid items-center gap-1.5" style={{ gridTemplateColumns: "22px 1fr 26px" }}>
                <span className="text-[10px] uppercase text-t3">{STAT_LABELS[k]}</span>
                <StatBar base={r.baseStats[k]} ev={m.spread.evs[k] || 0} height={6} />
                <span className="text-right text-[10px] tabular-nums text-t2">
                  {computeStat(r.baseStats[k], m.spread.ivs[k] ?? 31, m.spread.evs[k] || 0, m.level, k, nat)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-t3">{m.item ?? "no item"}</span>
          <span className={ev < 508 ? "text-warn" : "text-t3"}>{ev}/508</span>
        </div>
      </button>
    );
  }

  const rightColumn = (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => setTab("team")}
          className={`rounded-md border px-[11px] py-[5px] text-[12px] font-medium ${
            tab === "team" ? "border-accln bg-accbg text-acc" : "border-line text-t2 hover:text-t1"}`}>
          {isBox ? "Box" : "Team"} ({members.length})
        </button>
        {members.map((m, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`flex items-center gap-1 rounded-md px-[10px] py-[5px] text-[12px] font-medium ${
              tab === i ? "bg-accbg text-acc" : "text-t3 hover:text-t1"}`}>
            <PokeIcon species={m.species} />
            <span className="max-w-[6rem] truncate">{refOf(m.species).name}</span>
          </button>
        ))}
        {members.length < limit && (
          <button onClick={() => { setPanel(null); setTab("add"); }}
            className={`rounded-md border border-dashed px-[10px] py-[5px] text-[12px] ${
              tab === "add" ? "border-accln text-acc" : "border-line text-t3 hover:text-t1"}`}>
            ＋
          </button>
        )}
      </div>

      {tab === "add" && members.length < limit ? (
        <div className="rounded-lg border border-line bg-panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-t1">Add a Pokémon</h3>
            <button onClick={() => setTab("team")} className="text-xs text-t3 hover:text-t1">Cancel</button>
          </div>
          <SelectorPanel title="Pokémon" options={poolOptions}
            onSelect={(v) => v && addMember(slugByName[v] ?? "")} onClose={() => setTab("team")} />
        </div>
      ) : tab === "team" ? (
        members.length === 0 ? (
          <button onClick={() => setTab("add")}
            className="rounded-lg border border-dashed border-line px-4 py-6 text-sm text-t2 hover:border-accln hover:text-t1">
            ＋ Add your first Pokémon
          </button>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {members.map((_, i) => overviewCard(i))}
          </div>
        )
      ) : (
        memberCard(tab as number)
      )}
    </div>
  );

  if (isBox) return <div className="space-y-3.5">{rightColumn}</div>;

  return (
    <div className="space-y-3.5">
      {/* Status strip — team name lives here so the page header stays slim */}
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-line sm:grid-cols-[minmax(0,1.4fr)_repeat(4,1fr)]" style={{ gap: 1, background: "var(--line)" }}>
        {teamName && (
          <div className="col-span-2 bg-panel px-[14px] py-[10px] sm:col-span-1">
            <div className="truncate text-[17px] font-bold tracking-[-0.01em] text-t1" title={teamName}>{teamName}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wide text-t3">Team</div>
          </div>
        )}
        <StatCell value={`${members.length} / ${limit}`} label="Slots filled" />
        <StatCell value="Reg M-B" suffix="Bo3" label="Champions VGC 2026" />
        <StatCell value={String(flags.length)} valueClass={flags.length ? "text-warn" : "text-pos"}
          suffix={flags.length ? "to look at" : "clear"} label="Open flags" />
        <StatCell value={savedLabel} label="Last saved" />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[320px_1fr]">
        {/* Left rail */}
        <div className="space-y-3.5">
          {/* Team sheet */}
          <div className="overflow-hidden rounded-lg border border-line bg-panel">
            <div className="flex items-center justify-between px-[10px] py-2">
              <span className="text-[13px] font-[600] text-t1">Team sheet</span>
              <span className="text-[11px] tabular-nums text-t3">{completeCount} / {limit} sets complete</span>
            </div>
            <div className="grid items-center px-[10px] py-[5px] text-[9px] uppercase tracking-wide text-t3"
              style={{ gridTemplateColumns: "1fr repeat(4, 20px) 24px" }}>
              <span>Member</span>
              <span title="Item (optional)" className="text-center">It</span>
              <span title="Ability" className="text-center">Ab</span>
              <span title="508 EVs spent" className="text-center">EV</span>
              <span title="Passes legality" className="text-center">Lg</span>
              <span />
            </div>
            {members.map((m, i) => {
              const r = refOf(m.species);
              const checks = [!!m.item, !!m.ability, evTotalOf(m) === 508, memberLegal(i)];
              const selected = tab === i;
              return (
                <div key={i} className="grid items-center border-b border-soft px-[10px] py-1.5"
                  style={{ gridTemplateColumns: "1fr repeat(4, 20px) 24px", borderLeft: `2px solid ${selected ? "var(--acc)" : "transparent"}`, background: selected ? "var(--soft)" : "transparent" }}>
                  <button onClick={() => setTab(i)} className="flex min-w-0 items-center gap-1.5 text-left">
                    <span className="grid h-[26px] w-8 shrink-0 place-items-center overflow-hidden">
                      <PokeIcon species={m.species} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-medium text-t1">{r.name}</span>
                      <span className="flex gap-0.5">
                        {r.types.map((t) => <TypeBadge key={t} type={t} />)}
                      </span>
                    </span>
                  </button>
                  {checks.map((ok, ci) => (
                    <span key={ci} className="mx-auto inline-flex h-[18px] w-[18px] items-center justify-center rounded text-[10px] font-bold"
                      style={{ background: ok ? "rgba(111,196,143,0.14)" : "rgba(215,176,106,0.16)", color: ok ? "var(--pos)" : "var(--warn)" }}>
                      {ok ? "✓" : "•"}
                    </span>
                  ))}
                  <button onClick={() => removeMember(i)} title="Remove from team" className="mx-auto h-5 w-5 text-[11px] text-t3 hover:text-neg">✕</button>
                </div>
              );
            })}
            <button onClick={() => members.length < limit && (setPanel(null), setTab("add"))}
              disabled={members.length >= limit}
              className="flex w-full items-center justify-between border-t border-line px-[10px] py-2 text-left disabled:cursor-default">
              <span className="flex items-center gap-1.5 text-[12px] text-t2">
                <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded border border-dashed border-line text-t3">＋</span>
                {members.length >= limit ? `Team full - ${limit} / ${limit}` : "Add Pokémon"}
              </span>
              <span className="text-[11px] tabular-nums text-t3">{members.length} / {limit} slots filled</span>
            </button>
          </div>

          {/* Flags */}
          <div className="rounded-lg border border-line bg-panel" style={{ borderLeftColor: "var(--warn)", borderLeftWidth: 2 }}>
            <button onClick={() => setFlagsOpen((o) => !o)} className="flex w-full items-center gap-2 px-[10px] py-2 text-left">
              <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums" style={{ background: "rgba(215,176,106,0.16)", color: "var(--warn)" }}>{flags.length}</span>
              <span className="text-[11.5px] font-[600] text-t1">things to look at on this team</span>
              <span className="ml-auto text-[11px] text-t3">{flagsOpen ? "Hide ▴" : "Show ▾"}</span>
            </button>
            {flagsOpen && flags.length > 0 && (
              <ul className="border-t border-soft">
                {flags.map((f, idx) => (
                  <li key={idx}>
                    <button onClick={() => setTab(f.i)} className="flex w-full items-center gap-2 border-b border-soft px-[10px] py-1.5 text-left last:border-0">
                      <span className="grid h-[26px] w-8 shrink-0 place-items-center overflow-hidden">
                        <PokeIcon species={members[f.i]!.species} />
                      </span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${f.kind === "Warning" ? "text-warn" : "bg-raise text-t2"}`}
                        style={f.kind === "Warning" ? { background: "rgba(215,176,106,0.16)" } : undefined}>{f.kind}</span>
                      <span className="min-w-0 flex-1 text-[11.5px] leading-[15px] text-t2">{f.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {flagsOpen && flags.length === 0 && (
              <p className="border-t border-soft px-[10px] py-2 text-[11.5px] text-pos">Nothing to look at - this team is clean.</p>
            )}
          </div>
        </div>

        {rightColumn}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-t3">{label}</span>
      {children}
    </label>
  );
}

function StatCell({ value, suffix, label, valueClass }: { value: string; suffix?: string; label: string; valueClass?: string }) {
  return (
    <div className="bg-panel px-[14px] py-[10px]">
      <div className={`flex items-baseline gap-1 text-[17px] font-bold tabular-nums ${valueClass ?? "text-t1"}`}>
        {value}
        {suffix && <span className="text-[11px] font-normal text-t3">{suffix}</span>}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-t3">{label}</div>
    </div>
  );
}
