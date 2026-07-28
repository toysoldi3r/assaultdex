import { Panel, ProvisionalTag, TypeBadge } from "@/components/ui";
import { assumptionsFor } from "@/domain/mechanics/assumptions";
import { recommend } from "@/domain/choicedex/recommend";
import {
  PROFILE_LABELS,
  type ProfileName,
} from "@/domain/choicedex/scoring";
import type { Combatant, Terrain, Weather } from "@/domain/types/battle";
import { listPokemon } from "@/server/repositories/pokemonRepo";
import { buildBattleState } from "./lib";

export const dynamic = "force-dynamic";

const PROFILES: ProfileName[] = [
  "balanced",
  "safest",
  "highestEv",
  "maxDamage",
  "longTerm",
  "aggressive",
  "conservative",
];

const HP_OPTIONS = [100, 75, 50, 25];

function SpeciesSelect({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: { slug: string; name: string }[];
  defaultValue?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
    >
      {options.map((o) => (
        <option key={o.slug} value={o.slug}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

function CombatantCard({ c }: { c: Combatant }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900/40 p-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{c.name}</span>
        <div className="flex gap-1">
          {c.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Lv{c.level} · HP {c.currentHp}/{c.stats.hp} · Spe {c.stats.spe} ·{" "}
        <span className="uppercase">{c.tier}</span>
      </p>
    </div>
  );
}

export default async function ChoiceDexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const pokemon = await listPokemon();
  const options = pokemon.map((p) => ({ slug: p.slug, name: p.name }));

  const submitted = Boolean(sp.u1 && sp.u2 && sp.o1 && sp.o2);
  const profile = (sp.profile as ProfileName) ?? "balanced";

  let state = null;
  if (submitted) {
    state = await buildBattleState({
      user: [sp.u1!, sp.u2!],
      opponent: [sp.o1!, sp.o2!],
      userHp: [Number(sp.u1hp ?? 100) / 100, Number(sp.u2hp ?? 100) / 100],
      opponentHp: [Number(sp.o1hp ?? 100) / 100, Number(sp.o2hp ?? 100) / 100],
      field: {
        weather: (sp.weather ?? "none") as Weather,
        terrain: (sp.terrain ?? "none") as Terrain,
        trickRoom: sp.trickroom === "1",
      },
      userConditions: { tailwind: sp.utw === "1" },
      opponentConditions: { tailwind: sp.otw === "1" },
    });
  }

  const recommendations = state
    ? recommend(state, { profile, limit: 5 })
    : [];

  const def = (i: number) => options[i % options.length]?.slug;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">ChoiceDex</h1>
        <ProvisionalTag />
      </div>
      <p className="max-w-2xl text-sm text-slate-400">
        Select two active user Pokémon and two active opponent Pokémon, enter a
        basic battle state, and get ranked action recommendations. All damage,
        speed, and type calculations are provisional and unverified for Pokémon
        Champions.
      </p>

      {pokemon.length === 0 ? (
        <Panel>
          <p className="text-sm text-slate-400">
            Import Pokémon first: <code>pnpm db:seed</code>.
          </p>
        </Panel>
      ) : (
        <form method="get">
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Your side">
              <div className="space-y-2">
                <SpeciesSelect name="u1" options={options} defaultValue={sp.u1 ?? def(0)} />
                <SpeciesSelect name="u2" options={options} defaultValue={sp.u2 ?? def(1)} />
                <div className="flex gap-2 text-xs">
                  <HpSelect name="u1hp" defaultValue={sp.u1hp} />
                  <HpSelect name="u2hp" defaultValue={sp.u2hp} />
                </div>
              </div>
            </Panel>
            <Panel title="Opponent side">
              <div className="space-y-2">
                <SpeciesSelect name="o1" options={options} defaultValue={sp.o1 ?? def(2)} />
                <SpeciesSelect name="o2" options={options} defaultValue={sp.o2 ?? def(3)} />
                <div className="flex gap-2 text-xs">
                  <HpSelect name="o1hp" defaultValue={sp.o1hp} />
                  <HpSelect name="o2hp" defaultValue={sp.o2hp} />
                </div>
              </div>
            </Panel>
          </div>
          <Panel title="Field state" className="mt-4">
            <div className="flex flex-wrap items-end gap-3 text-sm">
              <label className="text-xs text-slate-400">
                Weather
                <select
                  name="weather"
                  defaultValue={sp.weather ?? "none"}
                  className="mt-0.5 block rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                >
                  {["none", "sun", "rain", "sand", "snow"].map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-400">
                Terrain
                <select
                  name="terrain"
                  defaultValue={sp.terrain ?? "none"}
                  className="mt-0.5 block rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                >
                  {["none", "electric", "grassy", "misty", "psychic"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1 text-xs text-slate-400">
                <input type="checkbox" name="trickroom" value="1" defaultChecked={sp.trickroom === "1"} />
                Trick Room
              </label>
              <label className="flex items-center gap-1 text-xs text-slate-400">
                <input type="checkbox" name="utw" value="1" defaultChecked={sp.utw === "1"} />
                Your Tailwind
              </label>
              <label className="flex items-center gap-1 text-xs text-slate-400">
                <input type="checkbox" name="otw" value="1" defaultChecked={sp.otw === "1"} />
                Opp. Tailwind
              </label>
            </div>
          </Panel>

          <div className="mt-4 flex items-end gap-3">
            <label className="text-sm">
              <span className="mr-2 text-slate-400">Profile</span>
              <select
                name="profile"
                defaultValue={profile}
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
              >
                {PROFILES.map((p) => (
                  <option key={p} value={p}>
                    {PROFILE_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
            >
              Recommend
            </button>
          </div>
        </form>
      )}

      {submitted && !state && (
        <Panel>
          <p className="text-sm text-rose-400">
            Could not build the battle state — a selected Pokémon was not found.
            Re-run the seed and try again.
          </p>
        </Panel>
      )}

      {state && (
        <Panel title="Battle state">
          <p className="mb-3 text-xs text-slate-400">
            Field: weather {state.field.weather}, terrain {state.field.terrain}
            {state.field.trickRoom ? ", Trick Room" : ""}
            {state.user.conditions.tailwind ? ", your Tailwind" : ""}
            {state.opponent.conditions.tailwind ? ", opp. Tailwind" : ""}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs uppercase text-slate-500">Your active</p>
              {state.user.active.map((c, i) =>
                c ? <CombatantCard key={i} c={c} /> : null,
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase text-slate-500">Opponent active</p>
              {state.opponent.active.map((c, i) =>
                c ? <CombatantCard key={i} c={c} /> : null,
              )}
            </div>
          </div>
        </Panel>
      )}

      {recommendations.length > 0 && (
        <Panel title={`Recommendations — ${PROFILE_LABELS[profile]}`}>
          <ol className="space-y-4">
            {recommendations.map((rec, i) => (
              <li
                key={i}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="mr-2 rounded bg-amber-500 px-2 py-0.5 text-xs font-bold text-black">
                      #{i + 1}
                    </span>
                    {rec.actionLines.map((line, j) => (
                      <span key={j} className="mr-3 text-sm font-medium">
                        {line}
                      </span>
                    ))}
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-slate-400">
                      score{" "}
                      <span className="font-mono text-amber-400">
                        {rec.breakdown.total.toFixed(3)}
                      </span>
                    </div>
                    <div className="text-slate-500">
                      confidence {(rec.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-sm text-slate-300">
                  {rec.expectedPosition}
                </p>

                {rec.damage.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-slate-400">
                    {rec.damage.map((d, k) => {
                      const mods = d.damage.modifiers.filter(
                        (m) => m.multiplier !== 1 && m.name !== "type effectiveness",
                      );
                      return (
                        <li key={k}>
                          {d.attacker} → {d.target} ({d.moveName}):{" "}
                          {d.damage.minPercent}–{d.damage.maxPercent}% (exp{" "}
                          {d.damage.expectedPercent}%), OHKO{" "}
                          {(d.damage.ohkoProbability * 100).toFixed(0)}%, 2HKO{" "}
                          {(d.damage.twoHitKoProbability * 100).toFixed(0)}%,{" "}
                          {d.movesFirst ? "moves first" : "moves second"}
                          {mods.length > 0 && (
                            <span className="text-slate-500">
                              {" "}
                              · {mods.map((m) => `${m.name}×${m.multiplier}`).join(", ")}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="mt-2 flex flex-wrap gap-1 text-xs">
                  {rec.breakdown.factors.map((f) => (
                    <span
                      key={f.name}
                      className="rounded bg-slate-800 px-2 py-0.5 text-slate-300"
                      title={`raw ${f.raw}, weight ${f.weight}`}
                    >
                      {f.name}: {f.contribution.toFixed(3)}
                    </span>
                  ))}
                </div>

                <p className="mt-2 text-xs text-rose-300/80">
                  Risk: {rec.mainRisk}
                </p>
                <p className="mt-1 text-xs text-slate-500">{rec.explanation}</p>

                <details className="mt-2 text-xs text-slate-500">
                  <summary className="cursor-pointer">Assumptions</summary>
                  <ul className="mt-1 list-disc pl-4">
                    {assumptionsFor(rec.assumptions).map((a) => (
                      <li key={a.id}>{a.description}</li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}

function HpSelect({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? "100"}
      className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1"
      aria-label={`${name} HP percent`}
    >
      {HP_OPTIONS.map((h) => (
        <option key={h} value={h}>
          {h}% HP
        </option>
      ))}
    </select>
  );
}
