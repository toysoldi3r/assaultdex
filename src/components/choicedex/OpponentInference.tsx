"use client";

import { useMemo, useState } from "react";
import { assumptionsFor } from "@/domain/mechanics/assumptions";
import {
  inferSpeed,
  type NatureSign,
  type SpeedObservation,
} from "@/domain/choicedex/speedInference";
import type { PokemonRef } from "@/lib/choicedexBuild";

const KIND_LABELS: Record<SpeedObservation["kind"], string> = {
  "faster-than": "moved before a Speed of",
  "slower-than": "moved after a Speed of",
  "speed-tie": "tied a Speed of",
};

const NATURE_LABELS: Record<NatureSign, string> = {
  "+": "Speed+ (Timid/Jolly)",
  "0": "neutral",
  "-": "Speed− (Brave/Quiet)",
};

export function OpponentInference({ pokemon }: { pokemon: PokemonRef[] }) {
  const [species, setSpecies] = useState(pokemon[0]?.slug ?? "");
  const [observations, setObservations] = useState<SpeedObservation[]>([]);
  const [kind, setKind] = useState<SpeedObservation["kind"]>("faster-than");
  const [speedInput, setSpeedInput] = useState(100);

  const ref = pokemon.find((p) => p.slug === species);
  const baseSpeed = ref?.baseStats.spe ?? 0;

  const inf = useMemo(
    () => (ref ? inferSpeed(baseSpeed, observations, 50) : null),
    [ref, baseSpeed, observations],
  );

  const addObservation = () =>
    setObservations((o) => [...o, { kind, speed: speedInput }]);
  const clear = () => setObservations([]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Enter what you have seen of an unknown opponent&apos;s move order to narrow
        its Speed and spread. Priors are a uniform spread grid (not usage-based).
      </p>

      <div className="flex flex-wrap items-end gap-2 text-sm">
        <label className="text-xs text-slate-400">
          Opponent
          <select
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            className="mt-0.5 block rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            {pokemon.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name} (base Spe {p.baseStats.spe})
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Observation
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as SpeedObservation["kind"])}
            className="mt-0.5 block rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            {(Object.keys(KIND_LABELS) as SpeedObservation["kind"][]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Speed
          <input
            type="number"
            value={speedInput}
            onChange={(e) => setSpeedInput(Number(e.target.value))}
            className="mt-0.5 block w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          />
        </label>
        <button
          onClick={addObservation}
          className="rounded bg-amber-500 px-3 py-1 text-sm font-semibold text-black hover:bg-amber-400"
        >
          Add
        </button>
        {observations.length > 0 && (
          <button
            onClick={clear}
            className="rounded border border-slate-600 px-3 py-1 text-sm hover:border-amber-500"
          >
            Clear
          </button>
        )}
      </div>

      {observations.length > 0 && (
        <ul className="list-disc pl-5 text-xs text-slate-400">
          {observations.map((o, i) => (
            <li key={i}>
              {ref?.name} {KIND_LABELS[o.kind]} {o.speed}
            </li>
          ))}
        </ul>
      )}

      {inf && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold">
              Possible Speed:{" "}
              {inf.minSpeed === null
                ? "no spread fits these observations"
                : `${inf.minSpeed}–${inf.maxSpeed}`}
            </span>
            <span className="text-xs text-slate-500">
              confidence {(inf.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {inf.remaining}/{inf.total} spreads remain ({inf.eliminated} ruled
            out). Max-Speed investment{" "}
            {inf.maxInvestmentPossible ? "still possible" : "ruled out"}.
          </p>
          <div className="mt-2 space-y-1">
            {(Object.keys(inf.natureShare) as NatureSign[]).map((n) => (
              <div key={n} className="flex items-center gap-2 text-xs">
                <span className="w-40 text-slate-400">{NATURE_LABELS[n]}</span>
                <span className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
                  <span
                    className="block h-full bg-amber-500"
                    style={{ width: `${inf.natureShare[n] * 100}%` }}
                  />
                </span>
                <span className="w-10 text-right tabular-nums text-slate-400">
                  {(inf.natureShare[n] * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
          <details className="mt-2 text-xs text-slate-500">
            <summary className="cursor-pointer">Assumptions</summary>
            <ul className="mt-1 list-disc pl-4">
              {assumptionsFor(inf.assumptions).map((a) => (
                <li key={a.id}>{a.description}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
