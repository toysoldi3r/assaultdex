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
    // Otherwise match name, type, and ability — moves are deliberately excluded
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

    matched.sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "num"
          ? a.num - b.num
          : sort === "bst"
            ? bst(b) - bst(a)
            : b.baseStats[sort] - a.baseStats[sort],
    );
    return matched;
  }, [q, sort, champions, full, showAll]);

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
      </div>

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
