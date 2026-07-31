"use client";

import { useMemo, useState } from "react";
import {
  compareScenarios,
  withScenario,
} from "@/domain/choicedex/sandbox";
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

function delta(n: number): string {
  return (n > 0 ? "+" : "") + n.toFixed(3);
}

export function Sandbox({ pokemon }: { pokemon: PokemonRef[] }) {
  const refBySlug = useMemo(
    () => new Map(pokemon.map((p) => [p.slug, p])),
    [pokemon],
  );
  const opts = pokemon.map((p) => ({ slug: p.slug, name: p.name }));
  const d = (i: number) => opts[i % opts.length]?.slug ?? "";

  const [sel, setSel] = useState({ u1: d(0), u2: d(1), o1: d(2), o2: d(3) });
  const [profile, setProfile] = useState<ProfileName>("balanced");
  // Variant knobs (do not touch the baseline).
  const [oppHp, setOppHp] = useState(50);
  const [userTailwind, setUserTailwind] = useState(true);

  const comparison = useMemo(() => {
    const form: TurnForm = {
      user: emptySide(sel.u1, sel.u2),
      opponent: emptySide(sel.o1, sel.o2),
      weather: "none",
      terrain: "none",
      trickRoom: false,
      note: "",
    };
    const baseline = buildState(form, refBySlug);
    if (!baseline) return null;
    const variant = withScenario(baseline, (draft) => {
      const foe = draft.opponent.active[0];
      if (foe) {
        foe.currentHp = Math.max(0, Math.round((foe.stats.hp * oppHp) / 100));
        foe.fainted = foe.currentHp <= 0;
      }
      draft.user.conditions.tailwind = userTailwind;
    });
    return compareScenarios(baseline, variant, profile);
  }, [sel, profile, oppHp, userTailwind, refBySlug]);

  const set = (k: keyof typeof sel) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setSel((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Copy the current position, change a variable, and see how the best
        recommendation shifts. The baseline is never modified. Provisional.
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

      <div className="flex flex-wrap items-end gap-3 rounded border border-slate-800 p-3 text-xs text-slate-400">
        <span className="font-semibold uppercase text-slate-500">Variant</span>
        <label>
          Opp #1 HP%
          <input
            type="number"
            min={0}
            max={100}
            value={oppHp}
            onChange={(e) => setOppHp(Number(e.target.value))}
            className="ml-1 w-16 rounded border border-slate-700 bg-slate-900 px-1 py-1 text-slate-100"
          />
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={userTailwind}
            onChange={(e) => setUserTailwind(e.target.checked)}
          />
          Your Tailwind
        </label>
        <label className="ml-auto">
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
      </div>

      {comparison && (
        <div className="grid gap-3 md:grid-cols-3">
          <ScenarioCard title="Baseline" s={comparison.baseline} />
          <ScenarioCard title="Variant" s={comparison.variant} />
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs">
            <h4 className="mb-2 font-semibold uppercase text-slate-500">Δ</h4>
            <p>score: {delta(comparison.deltas.score)}</p>
            <p>expected dmg: {delta(comparison.deltas.expectedDamage)}%</p>
            <p>KO prob: {delta(comparison.deltas.koProbability)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ScenarioCard({
  title,
  s,
}: {
  title: string;
  s: {
    topActions: string[];
    topScore: number;
    expectedDamage: number;
    koProbability: number;
  };
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs">
      <h4 className="mb-2 font-semibold uppercase text-slate-500">{title}</h4>
      <p className="text-slate-300">{s.topActions.join("; ") || "—"}</p>
      <p className="mt-1 text-slate-400">score {s.topScore.toFixed(3)}</p>
      <p className="text-slate-400">exp dmg {s.expectedDamage}%</p>
      <p className="text-slate-400">KO {(s.koProbability * 100).toFixed(0)}%</p>
    </div>
  );
}
