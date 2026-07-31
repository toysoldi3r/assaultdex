"use client";

import { useMemo, useState } from "react";
import { TypeBadge } from "@/components/ui";
import type { PokemonType } from "@/domain/types/pokemon";

export interface PickEntry {
  slug: string;
  name: string;
  types: PokemonType[];
  abilities: string[];
}

export function TeamCreate({
  pokemon,
  createAction,
}: {
  pokemon: PickEntry[];
  createAction: (formData: FormData) => void | Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const bySlug = useMemo(() => new Map(pokemon.map((p) => [p.slug, p])), [pokemon]);

  const results = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return pokemon.slice(0, 30);
    return pokemon
      .filter(
        (p) =>
          p.name.toLowerCase().includes(n) ||
          p.types.some((t) => t.toLowerCase().includes(n)) ||
          p.abilities.some((a) => a.toLowerCase().includes(n)),
      )
      .slice(0, 30);
  }, [q, pokemon]);

  const full = selected.length >= 6;
  const toggle = (slug: string) =>
    setSelected((s) =>
      s.includes(slug) ? s.filter((x) => x !== slug) : s.length < 6 ? [...s, slug] : s,
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {selected.length === 0 ? (
          <span className="text-sm text-slate-500">
            Click Pokémon below to add up to 6.
          </span>
        ) : (
          selected.map((slug) => {
            const p = bySlug.get(slug);
            return (
              <button
                key={slug}
                type="button"
                onClick={() => toggle(slug)}
                className="flex items-center gap-1 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-black hover:bg-amber-400"
                title="Remove"
              >
                {p?.name ?? slug} <span aria-hidden>×</span>
              </button>
            );
          })
        )}
      </div>

      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, type, or ability…"
        className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
      />

      <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
        {results.map((p) => {
          const on = selected.includes(p.slug);
          const disabled = full && !on;
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => toggle(p.slug)}
              disabled={disabled}
              className={`flex items-center justify-between gap-1 rounded border px-2 py-1 text-left text-sm ${
                on
                  ? "border-amber-500 bg-amber-500/10 text-amber-200"
                  : "border-slate-800 hover:border-amber-500/60 disabled:opacity-30"
              }`}
            >
              <span className="truncate">{p.name}</span>
              <span className="flex shrink-0 gap-0.5">
                {p.types.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <form action={createAction} className="flex flex-wrap items-center gap-2">
        <input
          name="name"
          required
          placeholder="Team name"
          className="min-w-[12rem] flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
        {selected.map((slug) => (
          <input key={slug} type="hidden" name="species" value={slug} />
        ))}
        <button
          type="submit"
          disabled={selected.length === 0}
          className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-40"
        >
          Create team ({selected.length}/6)
        </button>
      </form>
    </div>
  );
}
