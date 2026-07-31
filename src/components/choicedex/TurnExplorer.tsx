"use client";

import { useMemo, useState } from "react";
import {
  exploreTurns,
  type TurnNode,
} from "@/domain/choicedex/turnExplorer";
import {
  PROFILE_LABELS,
  type ProfileName,
} from "@/domain/choicedex/scoring";
import {
  buildState,
  emptySide,
  type PokemonRef,
  type TurnForm,
} from "@/lib/choicedexBuild";

const PROFILES = Object.keys(PROFILE_LABELS) as ProfileName[];

export function TurnExplorer({ pokemon }: { pokemon: PokemonRef[] }) {
  const refBySlug = useMemo(
    () => new Map(pokemon.map((p) => [p.slug, p])),
    [pokemon],
  );
  const opts = pokemon.map((p) => ({ slug: p.slug, name: p.name }));
  const d = (i: number) => opts[i % opts.length]?.slug ?? "";

  const [sel, setSel] = useState({ u1: d(0), u2: d(1), o1: d(2), o2: d(3) });
  const [profile, setProfile] = useState<ProfileName>("balanced");
  const [maxDepth, setMaxDepth] = useState(3);
  const [beamWidth, setBeamWidth] = useState(2);

  const result = useMemo(() => {
    const form: TurnForm = {
      user: emptySide(sel.u1, sel.u2),
      opponent: emptySide(sel.o1, sel.o2),
      weather: "none",
      terrain: "none",
      trickRoom: false,
      note: "",
    };
    const state = buildState(form, refBySlug);
    if (!state) return null;
    return exploreTurns(state, profile, {
      maxDepth,
      beamWidth,
      probabilityThreshold: 0.05,
      maxNodes: 250,
    });
  }, [sel, profile, maxDepth, beamWidth, refBySlug]);

  const set = (k: keyof typeof sel) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setSel((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Bounded decision tree of the next turns: your best action lines (beam),
        the opponent&apos;s best response, and low/high damage-roll outcomes with
        per-node probability. Provisional.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {(["u1", "u2", "o1", "o2"] as const).map((k) => (
          <label key={k} className="text-xs text-slate-400">
            {k.startsWith("u") ? "You" : "Opp"} slot {k[1]}
            <select
              value={sel[k]}
              onChange={set(k)}
              className="mt-0.5 block w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
            >
              {opts.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 text-xs text-slate-400">
        <label>
          Profile
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value as ProfileName)}
            className="ml-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            {PROFILES.map((p) => (
              <option key={p} value={p}>
                {PROFILE_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Depth
          <input
            type="number"
            min={1}
            max={4}
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value))}
            className="ml-1 w-14 rounded border border-slate-700 bg-slate-900 px-1 py-1 text-slate-100"
          />
        </label>
        <label>
          Beam
          <input
            type="number"
            min={1}
            max={4}
            value={beamWidth}
            onChange={(e) => setBeamWidth(Number(e.target.value))}
            className="ml-1 w-14 rounded border border-slate-700 bg-slate-900 px-1 py-1 text-slate-100"
          />
        </label>
      </div>

      {!result ? (
        <p className="text-sm text-rose-400">Pick a valid Pokémon in each slot.</p>
      ) : (
        <>
          <p className="text-xs text-slate-500">
            {result.nodesExpanded} nodes explored
            {result.truncated ? " (truncated at node budget)" : ""}.
          </p>
          <ul className="space-y-1 text-xs">
            {result.roots.map((n, i) => (
              <TreeNodeView key={i} node={n} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function TreeNodeView({ node }: { node: TurnNode }) {
  return (
    <li className="border-l border-slate-800 pl-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">
          {node.rollLabel} roll · p={node.probability}
        </span>
        <span className="text-slate-200">
          {node.userActions.join(" & ") || "—"}
        </span>
        <span className="text-slate-500">
          vs {node.opponentActions.join(" & ") || "—"}
        </span>
        <span className="font-mono text-amber-400">
          ev {node.score.toFixed(3)}
        </span>
      </div>
      <div className="text-[11px] text-slate-500">
        {node.hpSummary}
        {node.fainted.length > 0 ? ` · fainted: ${node.fainted.join(", ")}` : ""}
        {node.terminal ? " · end" : ""}
      </div>
      {node.children.length > 0 && (
        <ul className="mt-1 space-y-1">
          {node.children.map((c, i) => (
            <TreeNodeView key={i} node={c} />
          ))}
        </ul>
      )}
    </li>
  );
}
