"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PokeIcon } from "@/components/PokeIcon";

export function AbilityPokemonList({
  mons,
  championsSlugs,
}: {
  mons: { name: string; slug: string }[];
  championsSlugs: string[];
}) {
  const champs = useMemo(() => new Set(championsSlugs), [championsSlugs]);
  const [champsOnly, setChampsOnly] = useState(true);
  const shown = champsOnly ? mons.filter((m) => champs.has(m.slug)) : mons;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex overflow-hidden rounded border border-slate-700 text-xs">
          <button
            onClick={() => setChampsOnly(true)}
            className={`px-3 py-1.5 ${champsOnly ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}
          >
            Champions
          </button>
          <button
            onClick={() => setChampsOnly(false)}
            className={`px-3 py-1.5 ${!champsOnly ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}
          >
            Full dex
          </button>
        </div>
        <span className="text-xs text-slate-500">{shown.length} Pokémon</span>
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-slate-500">No Pokémon in this view have the ability.</p>
      ) : (
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
          {shown.map((m) => (
            <Link
              key={m.slug}
              href={`/pokemon/${m.slug}`}
              className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900/40 px-2 py-1 text-sm hover:border-amber-500"
            >
              <PokeIcon species={m.name} />
              <span className="truncate">{m.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
