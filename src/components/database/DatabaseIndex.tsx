"use client";

// The one-index Database view: a single search across items / abilities / moves,
// a left rail carrying kind + sort + per-kind attribute facets, a sortable
// results table, and a detail card that reads the selected entry in place. All
// derivation (search, facets, counts, sort) is client-side over the pre-built
// DexEntry[]; nothing navigates on selection. Colours use the app theme tokens
// (var(--…)) so both dark and light themes track; fixed px values come straight
// from the design spec.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PokeIcon } from "@/components/PokeIcon";
import { TYPE_HEX } from "@/components/ui";
import type { PokemonType } from "@/domain/types/pokemon";
import type { DexEntry, DexKind, EngineChip } from "@/data/dexIndex";

// --- static config ---------------------------------------------------------

const KINDS: { id: DexKind; label: string }[] = [
  { id: "item", label: "Items" },
  { id: "ability", label: "Abilities" },
  { id: "move", label: "Moves" },
];

const KIND_WORD: Record<DexKind, string> = { item: "items", ability: "abilities", move: "moves" };

type FacetGroup =
  | { id: string; label: string; options: string[] }
  | { id: "priority"; label: string; slider: true }
  | { id: "power"; label: string; range: true };

const FACETS: Record<DexKind, FacetGroup[]> = {
  item: [{ id: "category", label: "Item category", options: ["Power", "Defense", "Recovery", "Berry", "Utility"] }],
  ability: [{ id: "effect", label: "Effect", options: ["On entry", "Damage", "Priority", "Immunity", "Field"] }],
  move: [
    { id: "class", label: "Move class", options: ["Physical", "Special", "Status"] },
    { id: "priority", label: "Priority", slider: true },
    { id: "power", label: "Base power", range: true },
    { id: "type", label: "Move type", options: ["Normal", "Grass", "Water", "Steel", "Dark", "Rock", "Ice"] },
  ],
};

const SORTS: Record<DexKind, [string, string][]> = {
  item: [["fling", "Fling power"]],
  ability: [["popularity", "Most used"]],
  move: [["popularity", "Most used"]],
};

type SortKey = "popularity" | "name" | "engine" | "category" | "fling" | "power" | "priority";
const DEFAULT_DIR: Record<SortKey, "asc" | "desc"> = {
  popularity: "asc", name: "asc", category: "asc", engine: "asc", fling: "desc", power: "desc", priority: "desc",
};

// --- pure derivation helpers ----------------------------------------------

const engineText = (e: DexEntry): string => {
  const first = e.engine.find((c): c is string => typeof c === "string");
  return first || "—";
};

function sortField(e: DexEntry, key: SortKey): number | string {
  switch (key) {
    case "popularity": return e.rank;
    case "engine": return engineText(e).toLowerCase();
    case "name": return e.name.toLowerCase();
    case "fling": return e.fling == null ? -1 : e.fling;
    case "power": return e.power == null ? -1 : e.power;
    case "priority": return e.pri == null ? -99 : e.pri;
    case "category": return (e.category || e.group || e.type || "").toLowerCase();
  }
}

const fmtPri = (n: number): string => (n > 0 ? `+${n}` : String(n));

function matchFacet(e: DexEntry, groupId: string, opt: string): boolean {
  if (groupId === "category") return e.category === opt;
  if (groupId === "effect") return e.group === opt;
  if (groupId === "type") return e.type === opt.toLowerCase();
  if (groupId === "class") return e.mcat === opt.toLowerCase();
  return true;
}

const isTypeName = (t: string | undefined): t is PokemonType =>
  !!t && Object.prototype.hasOwnProperty.call(TYPE_HEX, t);

// --- small presentational atoms -------------------------------------------

function SectionHeader({ label, chevron, onToggle }: { label: string; chevron: string; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between text-[10px] font-medium uppercase tracking-[0.08em] text-t3"
      style={{ padding: "0 2px 4px" }}
    >
      <span>{label}</span>
      <span className="text-[9px]">{chevron}</span>
    </button>
  );
}

function TypeBadgeSm({ type }: { type: string }) {
  const bg = isTypeName(type) ? TYPE_HEX[type] : "#9FA19F";
  return (
    <span
      className="mono inline-block rounded-full text-[9px] font-bold uppercase leading-none"
      style={{
        padding: "2px 8px", letterSpacing: "0.09em", background: bg, color: "#fff",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
      }}
    >
      {type}
    </span>
  );
}

function CarrierPill({ carrier }: { carrier: { name: string; slug: string } }) {
  return (
    <span
      className="flex items-center text-[12px] text-t2"
      style={{ gap: "7px", border: "1px solid var(--line)", borderRadius: "999px", padding: "4px 11px 4px 5px" }}
    >
      <span
        className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-raise"
        style={{ width: "18px", height: "18px" }}
      >
        <PokeIcon species={carrier.slug} title="" />
      </span>
      {carrier.name}
    </span>
  );
}

// --- props -----------------------------------------------------------------

export interface DatabaseIndexProps {
  entries: DexEntry[];
  scope: "champions" | "full";
  query: string;
  /** Card widens when the app nav is collapsed. */
  navOpen: boolean;
  /** Which kind to open on first render (deep-linked via ?tab=). */
  initialKind?: DexKind;
  /** Hand the current entry to the calculator (switches the Tools tab). */
  onUseInCalculator: () => void;
}

// --- component -------------------------------------------------------------

export function DatabaseIndex({
  entries, scope, query, navOpen, initialKind = "item", onUseInCalculator,
}: DatabaseIndexProps) {
  const [kind, setKind] = useState<DexKind>(initialKind);
  const [facet, setFacet] = useState<Record<string, string[]>>({});
  const [prioMin, setPrioMin] = useState(0);
  const [powMin, setPowMin] = useState("");
  const [powMax, setPowMax] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("popularity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sel, setSel] = useState<string>(() => entries.find((e) => e.kind === "item")?.id ?? entries[0]?.id ?? "");
  const [collapsed, setCollapsed] = useState<Record<string, true>>({});

  const isOpen = (id: string) => collapsed[id] !== true;
  const toggleSection = (id: string) =>
    setCollapsed((c) => {
      const next = { ...c };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });

  const pickKind = (id: DexKind) => {
    setKind(id);
    setFacet({});
    setPrioMin(0);
    setPowMin("");
    setPowMax("");
    // Repaint the card with the new kind's list rather than leaving a stale
    // cross-kind selection (e.g. an item card while browsing moves).
    const first = entries.find((e) => e.kind === id);
    if (first) setSel(first.id);
  };

  const toggleFacet = (groupId: string, opt: string) =>
    setFacet((f) => {
      const next = { ...f };
      const cur = next[groupId] ?? [];
      next[groupId] = cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt];
      if (next[groupId].length === 0) delete next[groupId];
      return next;
    });

  const pickSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir(DEFAULT_DIR[key] ?? "asc");
    }
  };

  const clearAll = () => {
    setFacet({});
    setPrioMin(0);
    setPowMin("");
    setPowMax("");
  };

  // Scope + search base list (all kinds).
  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (scope === "champions" && !e.legal) return false;
      if (!q) return true;
      return `${e.name} ${e.effect}`.toLowerCase().includes(q);
    });
  }, [entries, scope, query]);

  const passesFacets = useMemo(() => {
    return (e: DexEntry, skipGroup?: string): boolean => {
      const groups = FACETS[e.kind];
      for (const g of groups) {
        if ("slider" in g || "range" in g || g.id === skipGroup) continue;
        const chosen = facet[g.id] ?? [];
        if (chosen.length > 0 && !chosen.some((opt) => matchFacet(e, g.id, opt))) return false;
      }
      if (e.kind !== "move") return true;
      if (skipGroup !== "priority" && prioMin !== 0 && (e.pri ?? 0) < prioMin) return false;
      if (skipGroup !== "power") {
        const lo = powMin === "" ? null : Number(powMin);
        const hi = powMax === "" ? null : Number(powMax);
        if (lo !== null || hi !== null) {
          if (e.power == null) return false;
          if (lo !== null && e.power < lo) return false;
          if (hi !== null && e.power > hi) return false;
        }
      }
      return true;
    };
  }, [facet, prioMin, powMin, powMax]);

  const rows = useMemo(
    () => base.filter((e) => e.kind === kind && passesFacets(e)),
    [base, kind, passesFacets],
  );

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = sortField(a, sortBy);
      const bv = sortField(b, sortBy);
      if (av === bv) return a.name.localeCompare(b.name);
      return (av > bv ? 1 : -1) * dir;
    });
  }, [rows, sortBy, sortDir]);

  // Keep a valid selection as the list changes; never navigate.
  useEffect(() => {
    if (!entries.some((e) => e.id === sel)) setSel(sorted[0]?.id ?? entries[0]?.id ?? "");
  }, [entries, sel, sorted]);
  const selected = entries.find((e) => e.id === sel) ?? sorted[0] ?? entries[0];

  const total = base.filter((e) => e.kind === kind).length;
  const dirArrow = sortDir === "asc" ? "↑" : "↓";
  const arrowFor = (key: SortKey) => (sortBy === key ? dirArrow : "");

  const kindCount = (k: DexKind) => base.filter((e) => e.kind === k && passesFacets(e)).length;
  const facetCount = (g: FacetGroup, opt: string) =>
    base.filter((e) => e.kind === kind && passesFacets(e, g.id) && matchFacet(e, g.id, opt)).length;

  // Applied-filter chips.
  const appliedChips: { label: string; onClear: () => void }[] = [];
  for (const g of FACETS[kind]) {
    if ("slider" in g || "range" in g) continue;
    for (const opt of facet[g.id] ?? []) {
      appliedChips.push({ label: `${g.label}: ${opt}`, onClear: () => toggleFacet(g.id, opt) });
    }
  }
  if (kind === "move" && prioMin !== 0) {
    appliedChips.push({ label: `Priority ≥ ${fmtPri(prioMin)}`, onClear: () => setPrioMin(0) });
  }
  if (kind === "move" && (powMin !== "" || powMax !== "")) {
    appliedChips.push({
      label: `Power ${powMin === "" ? "any" : powMin}–${powMax === "" ? "any" : powMax}`,
      onClear: () => { setPowMin(""); setPowMax(""); },
    });
  }

  const cardWidth = navOpen ? "412px" : "560px";

  // ------------------------------------------------------------------ render

  return (
    <div className="flex items-start" style={{ gap: "14px" }}>
      {/* 1. Filter rail */}
      <div className="flex shrink-0 flex-col" style={{ width: "160px", gap: "18px" }}>
        {/* Kind (never collapsible) */}
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-t3" style={{ padding: "0 2px 4px" }}>
            Kind
          </div>
          {KINDS.map((k) => {
            const active = kind === k.id;
            return (
              <button
                key={k.id}
                onClick={() => pickKind(k.id)}
                className={`flex w-full items-center justify-between text-[13px] ${active ? "font-medium text-acc" : "text-t2 hover:text-t1"}`}
                style={{ padding: "6px 9px", borderRadius: "6px", background: active ? "var(--accbg)" : "transparent" }}
              >
                <span>{k.label}</span>
                <span className={`mono text-[12px] ${active ? "text-acc" : "text-t3"}`}>{kindCount(k.id)}</span>
              </button>
            );
          })}
        </div>

        {/* Sort by (carries the top divider) */}
        <div style={{ borderTop: "1px solid var(--raise)", paddingTop: "14px" }}>
          <SectionHeader label="Sort by" chevron={isOpen("sort") ? "▾" : "▸"} onToggle={() => toggleSection("sort")} />
          {isOpen("sort") &&
            SORTS[kind].map(([key, label]) => {
              const active = sortBy === key;
              return (
                <button
                  key={key}
                  onClick={() => pickSort(key as SortKey)}
                  className={`flex w-full items-center justify-between text-[13px] ${active ? "font-medium text-acc" : "text-t2 hover:text-t1"}`}
                  style={{ padding: "4px 9px" }}
                >
                  <span>{label}</span>
                  {active && <span className="mono text-[12px] text-acc">{dirArrow}</span>}
                </button>
              );
            })}
        </div>

        {/* Facet groups */}
        {FACETS[kind].map((g) => {
          const open = isOpen(g.id);
          return (
            <div key={g.id}>
              <SectionHeader label={g.label} chevron={open ? "▾" : "▸"} onToggle={() => toggleSection(g.id)} />
              {open && "slider" in g && (
                <div style={{ padding: "2px 2px 0" }}>
                  <div className="mono flex items-center justify-between text-[12px] text-t1" style={{ marginBottom: "6px" }}>
                    <span>{prioMin === 0 ? "any priority" : `at least ${fmtPri(prioMin)}`}</span>
                    {prioMin !== 0 && (
                      <button onClick={() => setPrioMin(0)} className="text-[11px] text-t2 underline">reset</button>
                    )}
                  </div>
                  <input
                    type="range" min={-6} max={6} step={1} value={prioMin}
                    onChange={(e) => setPrioMin(Number(e.target.value))}
                    style={{ width: "100%", height: "16px", accentColor: "var(--acc)" }}
                  />
                  <div className="mono flex justify-between text-[10px] text-t3">
                    <span>−6</span><span>+6</span>
                  </div>
                </div>
              )}
              {open && "range" in g && (
                <div className="flex items-center" style={{ padding: "2px 2px 0", gap: "6px" }}>
                  <input
                    type="text" inputMode="numeric" placeholder="min" value={powMin}
                    onChange={(e) => setPowMin(e.target.value.replace(/\D/g, ""))}
                    className="mono text-[12px] text-t1"
                    style={{ flex: 1, height: "28px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "6px", padding: "0 8px", minWidth: 0 }}
                  />
                  <span className="text-[11px] text-t3">to</span>
                  <input
                    type="text" inputMode="numeric" placeholder="max" value={powMax}
                    onChange={(e) => setPowMax(e.target.value.replace(/\D/g, ""))}
                    className="mono text-[12px] text-t1"
                    style={{ flex: 1, height: "28px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "6px", padding: "0 8px", minWidth: 0 }}
                  />
                </div>
              )}
              {open && "options" in g &&
                g.options.map((opt) => {
                  const active = (facet[g.id] ?? []).includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => toggleFacet(g.id, opt)}
                      className={`flex w-full items-center justify-between text-[13px] ${active ? "font-medium text-acc" : "text-t2 hover:text-t1"}`}
                      style={{ padding: "4px 9px" }}
                    >
                      <span>{opt}</span>
                      <span className={`mono text-[11px] ${active ? "text-acc" : "text-t3"}`}>{facetCount(g, opt)}</span>
                    </button>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* Results + detail card share a wrapping region so the card drops below
          the results on narrow content columns instead of clipping off-screen. */}
      <div className="flex flex-1 flex-wrap items-start" style={{ gap: "14px", minWidth: 0 }}>
      {/* 2. Results column */}
      <div className="flex flex-1 flex-col" style={{ minWidth: "372px", gap: "8px" }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-t3">Results</span>
          <span className="mono text-[11px] text-t2">{`${sorted.length} of ${total} ${KIND_WORD[kind]}`}</span>
        </div>

        {sorted.length === 0 ? (
          <div
            className="text-center"
            style={{ border: "1px solid var(--line)", borderRadius: "10px", background: "var(--panel)", padding: "26px 18px" }}
          >
            <div className="text-[13px] text-t1">Nothing matches</div>
            <div className="text-[12px] text-t3" style={{ marginTop: "3px" }}>Try the full list, or clear a filter.</div>
          </div>
        ) : kind === "move" ? (
          <MovesResultTable
            rows={sorted} selId={selected?.id} onSelect={setSel}
            powArrow={arrowFor("power")} popArrow={arrowFor("popularity")}
            onSortPower={() => pickSort("power")} onSortPop={() => pickSort("popularity")}
          />
        ) : (
          <GenericResultTable
            kind={kind} rows={sorted} selId={selected?.id} onSelect={setSel}
            nameArrow={arrowFor("name")} engineArrow={arrowFor("engine")} popArrow={arrowFor("popularity")}
            onSortName={() => pickSort("name")} onSortEngine={() => pickSort("engine")} onSortPop={() => pickSort("popularity")}
          />
        )}
      </div>

      {/* 3. Detail card */}
      <div className="shrink-0" style={{ width: cardWidth, maxWidth: "100%", transition: "width 150ms" }}>
        {selected && (
          <DetailCard
            entry={selected}
            scope={scope}
            appliedChips={appliedChips}
            onClearAll={clearAll}
            onUseInCalculator={onUseInCalculator}
          />
        )}
      </div>
      </div>
    </div>
  );
}

// --- results tables --------------------------------------------------------

function HeaderButton({
  label, arrow, onClick, align = "left", pad,
}: {
  label: string; arrow: string; onClick: () => void; align?: "left" | "right"; pad: string;
}) {
  return (
    <button
      onClick={onClick}
      className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.08em] text-t2"
      style={{ padding: pad, textAlign: align, width: "100%" }}
    >
      {label}{arrow ? ` ${arrow}` : ""}
    </button>
  );
}

const ROW_BORDER = "1px solid var(--line)";

function GenericResultTable({
  kind, rows, selId, onSelect, nameArrow, engineArrow, popArrow, onSortName, onSortEngine, onSortPop,
}: {
  kind: DexKind; rows: DexEntry[]; selId?: string; onSelect: (id: string) => void;
  nameArrow: string; engineArrow: string; popArrow: string;
  onSortName: () => void; onSortEngine: () => void; onSortPop: () => void;
}) {
  const grid = "minmax(126px,1fr) minmax(150px,1.5fr) 104px";
  const nameHead = kind === "item" ? "Item" : "Ability";
  return (
    <div style={{ border: ROW_BORDER, borderRadius: "10px", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: grid, background: "var(--raise)", borderBottom: ROW_BORDER }}>
        <HeaderButton label={nameHead} arrow={nameArrow} onClick={onSortName} pad="8px 12px" />
        <HeaderButton label="Engine applies" arrow={engineArrow} onClick={onSortEngine} pad="8px 6px" />
        <HeaderButton label="Popularity" arrow={popArrow} onClick={onSortPop} align="right" pad="8px 12px 8px 6px" />
      </div>
      {rows.map((e) => {
        const active = e.id === selId;
        return (
          <div
            key={e.id}
            onClick={() => onSelect(e.id)}
            className="cursor-pointer"
            style={{
              display: "grid", gridTemplateColumns: grid, alignItems: "center",
              background: active ? "var(--soft)" : "var(--panel)",
              borderBottom: ROW_BORDER,
              boxShadow: active ? "inset 2px 0 0 var(--acc)" : undefined,
            }}
            onMouseEnter={(ev) => { if (!active) ev.currentTarget.style.background = "var(--raise)"; }}
            onMouseLeave={(ev) => { if (!active) ev.currentTarget.style.background = "var(--panel)"; }}
          >
            <div className="truncate text-[13px] text-t1" style={{ padding: "9px 12px", fontWeight: active ? 600 : 400 }}>
              {e.name}
            </div>
            <div className="mono truncate text-[12px] text-t2" style={{ padding: "9px 6px" }}>{engineText(e)}</div>
            <div
              className="mono text-[12px]"
              style={{ padding: "9px 12px 9px 6px", textAlign: "right", color: active ? "var(--acc)" : "var(--t3)" }}
            >
              {e.usage}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MovesResultTable({
  rows, selId, onSelect, powArrow, popArrow, onSortPower, onSortPop,
}: {
  rows: DexEntry[]; selId?: string; onSelect: (id: string) => void;
  powArrow: string; popArrow: string; onSortPower: () => void; onSortPop: () => void;
}) {
  const grid = "minmax(0,1fr) 78px 62px 66px";
  return (
    <div style={{ border: ROW_BORDER, borderRadius: "10px", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: grid, background: "var(--raise)", borderBottom: ROW_BORDER }}>
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-t2" style={{ padding: "8px 12px" }}>Move</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-t2" style={{ padding: "8px 6px" }}>Type</div>
        <HeaderButton label="Pow" arrow={powArrow} onClick={onSortPower} align="right" pad="8px 6px" />
        <HeaderButton label="Pop" arrow={popArrow} onClick={onSortPop} align="right" pad="8px 12px 8px 6px" />
      </div>
      {rows.map((e) => {
        const active = e.id === selId;
        return (
          <div
            key={e.id}
            onClick={() => onSelect(e.id)}
            className="cursor-pointer"
            style={{
              display: "grid", gridTemplateColumns: grid, alignItems: "center",
              background: active ? "var(--soft)" : "var(--panel)",
              borderBottom: ROW_BORDER,
              boxShadow: active ? "inset 2px 0 0 var(--acc)" : undefined,
            }}
            onMouseEnter={(ev) => { if (!active) ev.currentTarget.style.background = "var(--raise)"; }}
            onMouseLeave={(ev) => { if (!active) ev.currentTarget.style.background = "var(--panel)"; }}
          >
            <div className="truncate text-[13px] text-t1" style={{ padding: "9px 12px", fontWeight: active ? 600 : 400 }}>
              {e.name}
            </div>
            <div style={{ padding: "9px 6px" }}>{e.type && <TypeBadgeSm type={e.type} />}</div>
            <div
              className="mono text-[12px]"
              style={{ padding: "9px 6px", textAlign: "right", color: active ? "var(--t1)" : "var(--t2)" }}
            >
              {e.power == null ? "–" : e.power}
            </div>
            <div className="mono text-[12px] text-t2" style={{ padding: "9px 12px 9px 6px", textAlign: "right" }}>
              {e.usage}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- detail card -----------------------------------------------------------

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ flex: 1, background: "var(--raise)", padding: "9px 10px", minWidth: 0 }}>
      <div className="truncate text-[9px] uppercase text-t3" style={{ letterSpacing: "0.07em" }}>{label}</div>
      <div className="mono text-[15px]" style={{ color: color ?? "var(--t1)" }}>{value}</div>
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-t3">{children}</div>;
}

const detailHref = (e: DexEntry): string | null => {
  if (e.kind === "item") return `/database/item/${encodeURIComponent(e.name)}`;
  if (e.kind === "ability") return `/database/ability/${encodeURIComponent(e.name)}`;
  return null; // moves have no standalone detail page in the app
};

function DetailCard({
  entry, scope, appliedChips, onClearAll, onUseInCalculator,
}: {
  entry: DexEntry;
  scope: "champions" | "full";
  appliedChips: { label: string; onClear: () => void }[];
  onClearAll: () => void;
  onUseInCalculator: () => void;
}) {
  const kindLine =
    entry.kind === "move" ? entry.mcat : entry.kind === "item" ? `item · ${entry.category}` : "ability";

  const cells =
    entry.kind === "move"
      ? [
          { label: "Power", value: entry.power == null ? "–" : String(entry.power) },
          { label: "Acc", value: entry.acc ?? "—" },
          { label: "PP", value: entry.pp == null ? "–" : String(entry.pp) },
          { label: "Pri", value: fmtPri(entry.pri ?? 0), color: (entry.pri ?? 0) > 0 ? "var(--pos)" : "var(--t1)" },
          { label: "Usage", value: entry.usage },
        ]
      : entry.kind === "item"
        ? [
            { label: "Category", value: entry.category ?? "—" },
            { label: "Usage", value: entry.usage },
            { label: "Legal", value: entry.legal ? "Yes" : "No", color: entry.legal ? "var(--pos)" : "var(--warn)" },
          ]
        : // The @pkmn dataset carries no numeric ability rating, so surface the
          // format-legality flag (like items) instead of a fabricated "0/5".
          [
            { label: "Effect", value: entry.group ?? "—" },
            { label: "Usage", value: entry.usage },
            { label: "Legal", value: entry.legal ? "Yes" : "No", color: entry.legal ? "var(--pos)" : "var(--warn)" },
          ];

  const carriedLabel = `${entry.kind === "item" ? "Held by" : entry.kind === "ability" ? "Users" : "Carried by"} · ${scope === "champions" ? "Champions" : "Full list"}`;
  const openLabel = `Open ${entry.kind} page`;
  const href = detailHref(entry);

  return (
    <>
      {/* applied-filter row sits above the card, right-aligned */}
      <div className="flex flex-wrap items-center justify-end" style={{ gap: "7px", marginBottom: "9px" }}>
        <span className="text-[10px] uppercase tracking-[0.08em] text-t3">Applied</span>
        {appliedChips.length === 0 ? (
          <span className="text-[12px] text-t3">none</span>
        ) : (
          <>
            {appliedChips.map((c, i) => (
              <button
                key={i}
                onClick={c.onClear}
                className="text-[12px] text-acc"
                style={{ background: "var(--accbg)", border: "1px solid var(--accln)", borderRadius: "999px", padding: "4px 10px" }}
              >
                {c.label} ✕
              </button>
            ))}
            <button onClick={onClearAll} className="text-[12px] text-t2 underline">Clear all</button>
          </>
        )}
      </div>

      <div
        className="flex flex-col"
        style={{ border: ROW_BORDER, borderRadius: "10px", background: "var(--panel)", padding: "16px 18px", gap: "15px" }}
      >
        {/* 1. Title row */}
        <div className="flex flex-wrap items-center" style={{ gap: "10px" }}>
          <span className="text-[18px] font-semibold text-t1">{entry.name}</span>
          {entry.kind === "move" && entry.type && <TypeBadgeSm type={entry.type} />}
          <span className="text-[11px] uppercase tracking-[0.06em] text-t2">{kindLine}</span>
        </div>

        {/* 2. Stat strip */}
        <div style={{ display: "flex", gap: "1px", background: "var(--line)", border: ROW_BORDER, borderRadius: "8px", overflow: "hidden" }}>
          {cells.map((c) => (
            <StatCell key={c.label} label={c.label} value={c.value} color={"color" in c ? c.color : undefined} />
          ))}
        </div>

        {/* 3. Effect */}
        <div>
          <CardLabel>Effect</CardLabel>
          <p className="text-[13px] text-t2" style={{ lineHeight: 1.6, marginTop: "5px", textWrap: "pretty" }}>
            {entry.effect}
          </p>
        </div>

        {/* 4. What the engine applies */}
        <div>
          <div className="flex items-center" style={{ gap: "8px" }}>
            <CardLabel>What the engine applies</CardLabel>
            {entry.provisional && (
              <span
                className="text-[9px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: "var(--warn)", background: "rgba(215,176,106,0.14)", borderRadius: "4px", padding: "1px 6px" }}
              >
                provisional
              </span>
            )}
          </div>
          {entry.engine.length === 0 ? (
            <p className="text-[12px] text-t3" style={{ marginTop: "6px" }}>
              Nothing — flavour only, the calculator ignores it.
            </p>
          ) : (
            <div className="flex flex-wrap" style={{ gap: "6px", marginTop: "6px" }}>
              {entry.engine.map((c: EngineChip, i) =>
                typeof c === "string" ? (
                  <span
                    key={i}
                    className="mono text-[12px] text-t1"
                    style={{ background: "var(--raise)", border: ROW_BORDER, borderRadius: "6px", padding: "6px 9px" }}
                  >
                    {c}
                  </span>
                ) : (
                  <span
                    key={i}
                    className="text-[12px]"
                    style={{ color: "var(--warn)", background: "rgba(215,176,106,0.14)", borderRadius: "6px", padding: "6px 9px" }}
                  >
                    {c.text}
                  </span>
                ),
              )}
            </div>
          )}
        </div>

        {/* 5. Interaction */}
        {entry.interaction && (
          <div>
            <CardLabel>Interaction</CardLabel>
            <p className="text-[13px] text-t2" style={{ lineHeight: 1.6, marginTop: "5px", textWrap: "pretty" }}>
              {entry.interaction}
            </p>
          </div>
        )}

        {/* 6. Fling power (items only) */}
        {entry.kind === "item" && (
          <div className="flex items-baseline" style={{ gap: "9px" }}>
            <CardLabel>Fling power</CardLabel>
            <span className="mono text-[13px] text-t2">{entry.fling ?? "—"}</span>
          </div>
        )}

        {/* 7. Carried by */}
        {entry.carried.length > 0 && (
          <div>
            <CardLabel>{carriedLabel}</CardLabel>
            <div className="flex flex-wrap items-center" style={{ gap: "7px", marginTop: "8px" }}>
              {entry.carried.map((c) => (
                <CarrierPill key={c.slug + c.name} carrier={c} />
              ))}
              {entry.more > 0 && <span className="text-[12px] text-acc">+ {entry.more} more</span>}
            </div>
          </div>
        )}

        {/* 8. Actions */}
        <div className="flex flex-wrap" style={{ gap: "8px", marginTop: "auto" }}>
          {href ? (
            <Link
              href={href}
              className="text-[12px] text-acc"
              style={{ border: "1px solid var(--accln)", borderRadius: "7px", padding: "7px 12px" }}
            >
              {openLabel}
            </Link>
          ) : (
            <span
              className="text-[12px] text-t3"
              style={{ border: ROW_BORDER, borderRadius: "7px", padding: "7px 12px", cursor: "not-allowed" }}
              title="Moves have no standalone page yet"
            >
              {openLabel}
            </span>
          )}
          <button
            onClick={onUseInCalculator}
            className="text-[12px] text-t2"
            style={{ border: ROW_BORDER, borderRadius: "7px", padding: "7px 12px" }}
          >
            Use in calculator
          </button>
          <button
            className="text-[12px] text-t2"
            style={{ border: ROW_BORDER, borderRadius: "7px", padding: "7px 12px" }}
            title="Comparison view is not built yet"
          >
            Compare
          </button>
        </div>
      </div>
    </>
  );
}
