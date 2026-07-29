"use client";

import { useMemo, useState } from "react";
import { analyzeLeads } from "@/domain/choicedex/leads";
import {
  PROFILE_LABELS,
  type ProfileName,
} from "@/domain/choicedex/scoring";
import { DEFAULT_FIELD } from "@/domain/types/battle";
import {
  combatantFromRef,
  emptySlot,
  type PokemonRef,
} from "@/lib/choicedexBuild";

const PROFILES = Object.keys(PROFILE_LABELS) as ProfileName[];

function toggle(list: string[], slug: string, max: number): string[] {
  if (list.includes(slug)) return list.filter((s) => s !== slug);
  if (list.length >= max) return list;
  return [...list, slug];
}

export function LeadAnalyzer({ pokemon }: { pokemon: PokemonRef[] }) {
  const refBySlug = useMemo(
    () => new Map(pokemon.map((p) => [p.slug, p])),
    [pokemon],
  );
  const [user, setUser] = useState<string[]>(
    pokemon.slice(0, 4).map((p) => p.slug),
  );
  const [opp, setOpp] = useState<string[]>(
    pokemon.slice(4, 8).map((p) => p.slug),
  );
  const [profile, setProfile] = useState<ProfileName>("balanced");

  const ranked = useMemo(() => {
    const userC = user
      .map((s) => refBySlug.get(s))
      .filter(Boolean)
      .map((ref) => combatantFromRef(ref!, emptySlot(ref!.slug)));
    const oppC = opp
      .map((s) => refBySlug.get(s))
      .filter(Boolean)
      .map((ref) => combatantFromRef(ref!, emptySlot(ref!.slug)));
    return analyzeLeads({
      userCandidates: userC,
      opponentCandidates: oppC,
      field: DEFAULT_FIELD,
      profile,
    });
  }, [user, opp, profile, refBySlug]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Pick your candidate leads (2–4) and the opponent&apos;s likely leads
        (2–4). Each of your lead pairs is ranked against every likely opponent
        pair. Provisional.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <CandidatePicker
          title={`Your candidates (${user.length})`}
          options={pokemon}
          selected={user}
          onToggle={(slug) => setUser((l) => toggle(l, slug, 4))}
        />
        <CandidatePicker
          title={`Opponent candidates (${opp.length})`}
          options={pokemon}
          selected={opp}
          onToggle={(slug) => setOpp((l) => toggle(l, slug, 4))}
        />
      </div>

      <label className="text-sm text-slate-400">
        Profile
        <select
          value={profile}
          onChange={(e) => setProfile(e.target.value as ProfileName)}
          className="ml-2 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
        >
          {PROFILES.map((p) => (
            <option key={p} value={p}>
              {PROFILE_LABELS[p]}
            </option>
          ))}
        </select>
      </label>

      {ranked.length === 0 ? (
        <p className="text-sm text-slate-500">
          Select at least two candidates on each side.
        </p>
      ) : (
        <ol className="space-y-2">
          {ranked.map((r, i) => (
            <li
              key={i}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  #{i + 1} {r.lead[0]} + {r.lead[1]}
                </span>
                <span className="font-mono text-sm text-amber-400">
                  {r.score.toFixed(3)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1 text-xs">
                {r.factors.map((f) => (
                  <span
                    key={f.name}
                    className="rounded bg-slate-800 px-2 py-0.5 text-slate-300"
                  >
                    {f.name}: {f.value.toFixed(2)}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">{r.explanation}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function CandidatePicker({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: PokemonRef[];
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-1 text-sm">
        {options.map((p) => (
          <label key={p.slug} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.includes(p.slug)}
              onChange={() => onToggle(p.slug)}
            />
            {p.name}
          </label>
        ))}
      </div>
    </section>
  );
}
