"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Panel, TypeBadge } from "@/components/ui";
import { POKEMON_TYPES, type PokemonType } from "@/domain/types/pokemon";

export interface PokedexEntry {
  slug: string;
  name: string;
  num: number;
  types: PokemonType[];
  abilities: string[];
  baseStats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  /** In the Pokémon Champions roster. */
  champions: boolean;
  /** Legal move names (present for Champions entries; used by the move filter). */
  moves?: string[];
}

type SortKey = "num" | "bst" | "hp" | "atk" | "def" | "spa" | "spd" | "spe" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "num", label: "Dex number" },
  { key: "bst", label: "Total (BST)" },
  { key: "hp", label: "HP" },
  { key: "atk", label: "Attack" },
  { key: "def", label: "Defense" },
  { key: "spa", label: "Sp. Atk" },
  { key: "spd", label: "Sp. Def" },
  { key: "spe", label: "Speed" },
  { key: "name", label: "Name (A–Z)" },
];

function bst(e: PokedexEntry): number {
  return Object.values(e.baseStats).reduce((a, b) => a + b, 0);
}

export function PokedexBrowser({
  champions,
  fullCount,
}: {
  champions: PokedexEntry[];
  fullCount: number;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("num");
  const [showAll, setShowAll] = useState(false);
  const [full, setFull] = useState<PokedexEntry[] | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  // Advanced filter state.
  const [advOpen, setAdvOpen] = useState(false);
  const [fTypes, setFTypes] = useState<PokemonType[]>([]);
  const [fAbility, setFAbility] = useState("");
  // Up to four required moves so a full 4-move set can be searched at once.
  const [fMoves, setFMoves] = useState<string[]>(["", "", "", ""]);
  const [fMinBst, setFMinBst] = useState(""); // empty = no minimum
  const setMove = (i: number, v: string) =>
    setFMoves((prev) => prev.map((m, idx) => (idx === i ? v : m)));
  const toggleType = (t: PokemonType) =>
    setFTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const anyMove = fMoves.some((m) => m.trim());
  const advActive = fTypes.length > 0 || !!fAbility || anyMove || fMinBst.trim() !== "";
  const learns = (e: PokedexEntry, mv: string) => {
    const n = mv.trim().toLowerCase();
    return !n || (e.moves ?? []).some((m) => m.toLowerCase().includes(n));
  };

  // Lazy-load the full dex the first time the visitor asks for it.
  const enableFull = () => {
    setShowAll(true);
    if (full || loadingFull) return;
    setLoadingFull(true);
    fetch("/pokemon/all")
      .then((r) => r.json())
      .then((data: PokedexEntry[]) => setFull(data))
      .catch(() => setFull(champions)) // fall back to what we have
      .finally(() => setLoadingFull(false));
  };

  const championsCount = champions.length;

  const results = useMemo(() => {
    // Default view is the Pokémon Champions roster; the toggle opens the full dex.
    const scoped = showAll ? (full ?? []) : champions;
    const needle = q.trim().toLowerCase();
    // Exact type name (e.g. "water") = pure type filter, so ability names like
    // "Water Absorb" don't drag in non-Water mons.
    const exactType = POKEMON_TYPES.find((t) => t === needle);
    // Otherwise match name, type, and ability - moves are deliberately excluded
    // so a query like "lip" surfaces Pelipper, not every Flip Turn user.
    const matched = !needle
      ? [...scoped]
      : exactType
        ? scoped.filter((p) => p.types.includes(exactType))
        : scoped.filter((p) => {
            if (p.name.toLowerCase().includes(needle)) return true;
            if (p.types.some((t) => t.toLowerCase().includes(needle))) return true;
            if (p.abilities.some((a) => a.toLowerCase().includes(needle))) return true;
            return false;
          });

    // Advanced filters (all AND).
    const minBst = Number(fMinBst) || 0;
    const adv = matched.filter((p) => {
      if (fTypes.length && !fTypes.every((t) => p.types.includes(t))) return false;
      if (fAbility && !p.abilities.some((a) => a.toLowerCase().includes(fAbility.trim().toLowerCase()))) return false;
      if (!fMoves.every((mv) => learns(p, mv))) return false;
      if (minBst > 0 && bst(p) < minBst) return false;
      return true;
    });

    adv.sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "num"
          ? a.num - b.num
          : sort === "bst"
            ? bst(b) - bst(a)
            : b.baseStats[sort] - a.baseStats[sort],
    );
    return adv;
  }, [q, sort, champions, full, showAll, fTypes, fAbility, fMoves, fMinBst]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Pokédex</h1>
        <span className="text-xs text-slate-500">{results.length} shown</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowAll(false)}
          className={`rounded px-3 py-1 text-xs font-medium ${
            !showAll ? "bg-amber-500 text-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          Champions ({championsCount})
        </button>
        <button
          onClick={enableFull}
          className={`rounded px-3 py-1 text-xs font-medium ${
            showAll ? "bg-amber-500 text-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          Full dex ({fullCount}){loadingFull ? " …" : ""}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, type, or ability…"
          className="min-w-[16rem] flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          autoFocus
        />
        <label className="flex items-center gap-1 text-xs text-slate-400">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-slate-100"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </label>
        <button
          onClick={() => setAdvOpen((o) => !o)}
          className={`rounded border px-3 py-2 text-xs ${advActive ? "border-amber-500 text-amber-300" : "border-slate-700 text-slate-300"}`}
        >
          Advanced {advActive ? `(${[fTypes.length && "type", fAbility && "ability", anyMove && "moves", fMinBst.trim() !== "" && "BST"].filter(Boolean).length})` : ""}
        </button>
      </div>

      {advOpen && (
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs">
          <div>
            <span className="mb-1 block text-slate-500">Types (must have all selected)</span>
            <div className="flex flex-wrap gap-1">
              {POKEMON_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`rounded px-2 py-0.5 capitalize ${fTypes.includes(t) ? "ring-2 ring-amber-400" : "opacity-70 hover:opacity-100"}`}
                >
                  <TypeBadge type={t} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-slate-500">Ability contains</span>
              <input value={fAbility} onChange={(e) => setFAbility(e.target.value)} placeholder="e.g. Intimidate"
                className="w-40 rounded border border-slate-700 bg-slate-900 px-2 py-1" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-500">Min BST</span>
              <input
                type="number" min={0} max={780} step={10}
                value={fMinBst}
                onChange={(e) => setFMinBst(e.target.value)}
                placeholder="any"
                className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1"
              />
            </label>
            <button
              onClick={() => { setFTypes([]); setFAbility(""); setFMoves(["", "", "", ""]); setFMinBst(""); }}
              className="self-end rounded border border-slate-700 px-2 py-1 text-slate-400 hover:border-rose-500"
            >
              Clear
            </button>
          </div>
          <div>
            <span className="mb-1 block text-slate-500">Knows moves (up to 4, all required)</span>
            <div className="flex flex-wrap gap-2">
              {fMoves.map((mv, i) => (
                <input
                  key={i}
                  value={mv}
                  onChange={(e) => setMove(i, e.target.value)}
                  placeholder={["e.g. Protect", "e.g. Fake Out", "e.g. Ally Switch", "e.g. Follow Me"][i]}
                  className="w-40 rounded border border-slate-700 bg-slate-900 px-2 py-1"
                />
              ))}
            </div>
          </div>
          {showAll && anyMove && (
            <p className="text-[10px] text-amber-300/80">Move filter only applies to the Champions roster (full-dex movepools aren&apos;t loaded).</p>
          )}
        </div>
      )}

      {results.length === 0 ? (
        <Panel>
          <p className="text-sm text-slate-400">No Pokémon match “{q}”.</p>
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => {
            const showStat = sort !== "name" && sort !== "num";
            const shownStat = sort === "bst" ? bst(p) : showStat ? p.baseStats[sort] : bst(p);
            const statLabel = showStat && sort !== "bst" ? SORTS.find((s) => s.key === sort)!.label : "BST";
            return (
              <Link
                key={p.slug}
                href={`/pokemon/${p.slug}`}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 hover:border-amber-500/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">
                    <span className="mr-1 tabular-nums text-xs text-slate-500">
                      #{p.num}
                    </span>
                    {p.name}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    {p.types.map((t) => (
                      <TypeBadge key={t} type={t} />
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {statLabel} <span className="tabular-nums text-slate-400">{shownStat}</span>
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
