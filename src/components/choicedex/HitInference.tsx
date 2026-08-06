"use client";

import { useMemo, useState } from "react";
import { assumptionsFor } from "@/domain/mechanics/assumptions";
import { inferDefense, inferOffense } from "@/domain/choicedex/spreadInference";
import type { NatureSign } from "@/domain/choicedex/speedInference";
import type { MoveFixture, PokemonType } from "@/domain/types/pokemon";
import {
  combatantFromRef,
  emptySlot,
  type PokemonRef,
  type Variant,
} from "@/lib/choicedexBuild";

type Mode = "took" | "dealt";
type Weather = "none" | "sun" | "rain" | "sand" | "snow";
type Screen = "none" | "reflect" | "lightScreen" | "auroraVeil";

const NATURE_LABELS: Record<NatureSign, string> = {
  "+": "boosting",
  "0": "neutral",
  "-": "reducing",
};

function damagingMoves(ref: PokemonRef | undefined): MoveFixture[] {
  return (ref?.moves ?? []).filter((m) => m.category !== "status" && m.power !== null);
}

function screenConditions(s: Screen) {
  return {
    tailwind: false,
    reflect: s === "reflect",
    lightScreen: s === "lightScreen",
    auroraVeil: s === "auroraVeil",
  };
}

export function HitInference({
  pokemon,
  variants = {},
}: {
  pokemon: PokemonRef[];
  /** Battle formes (Mega / Primal / Aegislash-Blade) per species, with stats. */
  variants?: Record<string, Variant[]>;
}) {
  const bySlug = useMemo(() => new Map(pokemon.map((p) => [p.slug, p])), [pokemon]);
  const d = (i: number) => pokemon[i % pokemon.length]?.slug ?? "";

  const [mode, setMode] = useState<Mode>("took");
  const [oppSlug, setOppSlug] = useState(d(2));
  const [variantIdx, setVariantIdx] = useState(0);
  const [mySlug, setMySlug] = useState(d(0));
  const [moveName, setMoveName] = useState("");
  const [hpBefore, setHpBefore] = useState(100);
  const [hpAfter, setHpAfter] = useState(60);
  const [weather, setWeather] = useState<Weather>("none");
  const [screen, setScreen] = useState<Screen>("none");
  const [spread, setSpread] = useState(false);

  const opp = bySlug.get(oppSlug);
  const mine = bySlug.get(mySlug);
  // Selected battle forme (Mega / Aegislash-Blade …) overrides the opponent's
  // base stats and types for the inference; index 0 is the base forme.
  const oppVariants = variants[oppSlug] ?? [];
  const oppVar = oppVariants[variantIdx];
  const oppBase = oppVar?.baseStats ?? opp?.baseStats;
  const oppTypes = (oppVar?.types ?? opp?.types) as
    | [PokemonType]
    | [PokemonType, PokemonType]
    | undefined;
  // In "took" mode the mover is the opponent; in "dealt" mode it's your mon.
  const moverRef = mode === "took" ? opp : mine;
  const moves = damagingMoves(moverRef);
  const move = moves.find((m) => m.name === moveName) ?? moves[0];

  const result = useMemo(() => {
    if (!opp || !mine || !move || !oppBase || !oppTypes) return null;
    const field = { weather, terrain: "none" as const, trickRoom: false };
    const dmgFrac = Math.max(0, (hpBefore - hpAfter) / 100);

    if (mode === "took") {
      const defender = combatantFromRef(mine, emptySlot(mine.slug));
      const which = move.category === "physical" ? "atk" : "spa";
      const observedDamage = Math.round(defender.stats.hp * dmgFrac);
      const inf = inferOffense({
        baseStat: which === "atk" ? oppBase.atk : oppBase.spa,
        which,
        attackerTypes: oppTypes,
        level: 50,
        move,
        defender,
        field,
        defenderConditions: screenConditions(screen),
        observedDamage,
        spread,
      });
      return { kind: "offense" as const, inf, which, observedDamage, maxHp: defender.stats.hp };
    }

    const attacker = combatantFromRef(mine, emptySlot(mine.slug));
    const which = move.category === "physical" ? "def" : "spd";
    const inf = inferDefense({
      baseHp: oppBase.hp,
      baseDef: which === "def" ? oppBase.def : oppBase.spd,
      which,
      defenderTypes: oppTypes,
      level: 50,
      move,
      attacker,
      field,
      defenderConditions: screenConditions(screen),
      observedFraction: dmgFrac,
      spread,
    });
    return { kind: "defense" as const, inf, which };
  }, [mode, opp, mine, move, oppBase, oppTypes, hpBefore, hpAfter, weather, screen, spread]);

  const statLabel =
    result?.kind === "offense"
      ? result.which === "atk" ? "Attack" : "Sp. Atk"
      : result?.which === "def" ? "Defense" : "Sp. Def";

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Reconstruct an unknown opponent&apos;s EV/nature spread from one hit. Enter
        your Pokémon&apos;s HP% before and after — every spread whose damage rolls
        can&apos;t produce that result is ruled out. Provisional (uses the damage
        formula and a uniform, non-usage prior).
      </p>

      <div className="flex flex-wrap items-end gap-3 text-xs text-slate-400">
        <label>
          Scenario
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className="mt-0.5 block rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            <option value="took">My Pokémon took a hit → infer their offense</option>
            <option value="dealt">I hit their Pokémon → infer their bulk</option>
          </select>
        </label>
        <label>
          Opponent
          <select
            value={oppSlug}
            onChange={(e) => { setOppSlug(e.target.value); setVariantIdx(0); setMoveName(""); }}
            className="mt-0.5 block rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            {pokemon.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </select>
        </label>
        {oppVariants.length > 1 && (
          <label>
            Variant
            <select
              value={variantIdx}
              onChange={(e) => setVariantIdx(Number(e.target.value))}
              title="Mega / battle forme (e.g. Aegislash-Blade) — uses that forme's stats"
              className="mt-0.5 block rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
            >
              {oppVariants.map((v, i) => (
                <option key={v.label} value={i}>{v.label}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          Your Pokémon
          <select
            value={mySlug}
            onChange={(e) => { setMySlug(e.target.value); setMoveName(""); }}
            className="mt-0.5 block rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            {pokemon.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </select>
        </label>
        <label>
          {mode === "took" ? "Their move" : "Your move"}
          <select
            value={move?.name ?? ""}
            onChange={(e) => setMoveName(e.target.value)}
            className="mt-0.5 block rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            {moves.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name} ({m.category === "physical" ? "Phys" : "Spec"} {m.power})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-3 text-xs text-slate-400">
        <label>
          {mode === "took" ? "My" : "Their"} HP% before
          <input
            type="number" min={0} max={100} value={hpBefore}
            onChange={(e) => setHpBefore(Number(e.target.value))}
            className="mt-0.5 block w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          />
        </label>
        <label>
          {mode === "took" ? "My" : "Their"} HP% after
          <input
            type="number" min={0} max={100} value={hpAfter}
            onChange={(e) => setHpAfter(Number(e.target.value))}
            className="mt-0.5 block w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          />
        </label>
        <label>
          Weather
          <select
            value={weather}
            onChange={(e) => setWeather(e.target.value as Weather)}
            className="mt-0.5 block rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            {(["none", "sun", "rain", "sand", "snow"] as Weather[]).map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </label>
        <label>
          {mode === "took" ? "My" : "Their"}-side screen
          <select
            value={screen}
            onChange={(e) => setScreen(e.target.value as Screen)}
            className="mt-0.5 block rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            <option value="none">none</option>
            <option value="reflect">Reflect</option>
            <option value="lightScreen">Light Screen</option>
            <option value="auroraVeil">Aurora Veil</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={spread} onChange={(e) => setSpread(e.target.checked)} />
          Spread hit
        </label>
      </div>

      {result && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm">
          {result.inf.contradiction ? (
            <p className="text-rose-300">
              No spread produces that damage. Check the move, HP values, weather/
              screen, or whether an ability/item was involved.
            </p>
          ) : result.kind === "offense" ? (
            <>
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  Their {statLabel}: {result.inf.minStat}–{result.inf.maxStat}
                </span>
                <span className="text-xs text-slate-500">
                  confidence {(result.inf.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                EV range {result.inf.evMin}–{result.inf.evMax} ·{" "}
                {result.inf.remaining}/{result.inf.total} spreads remain ·
                max investment {result.inf.maxInvestmentPossible ? "possible" : "ruled out"}.
              </p>
              <div className="mt-2 space-y-1">
                {(Object.keys(result.inf.natureShare) as NatureSign[]).map((n) => (
                  <div key={n} className="flex items-center gap-2 text-xs">
                    <span className="w-20 text-slate-400">{NATURE_LABELS[n]}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
                      <span className="block h-full bg-amber-500"
                        style={{ width: `${result.inf.natureShare[n] * 100}%` }} />
                    </span>
                    <span className="w-10 text-right tabular-nums text-slate-400">
                      {(result.inf.natureShare[n] * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  Their {statLabel}: {result.inf.defMin}–{result.inf.defMax}
                </span>
                <span className="text-xs text-slate-500">
                  confidence {(result.inf.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                HP {result.inf.hpMin}–{result.inf.hpMax} · effective bulk (HP×{statLabel}){" "}
                {result.inf.bulkMin}–{result.inf.bulkMax} · {result.inf.remaining}/
                {result.inf.total} combos remain.
              </p>
              <p className="mt-1 text-[10px] text-slate-600">
                HP and {statLabel} are coupled from one hit, so ranges are wide —
                narrow them with a second observation.
              </p>
            </>
          )}
          <details className="mt-2 text-xs text-slate-500">
            <summary className="cursor-pointer">Assumptions</summary>
            <ul className="mt-1 list-disc pl-4">
              {assumptionsFor(result.inf.assumptions).map((a) => (
                <li key={a.id}>{a.description}</li>
              ))}
            </ul>
          </details>
          <p className="mt-2 text-[10px] text-slate-600">
            Your Pokémon is modeled with a neutral 0-EV level-50 spread; abilities
            and items are not assumed. Set them in the battle editor for exact math.
          </p>
        </div>
      )}
    </div>
  );
}
