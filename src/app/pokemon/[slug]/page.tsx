import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel, TypeBadge } from "@/components/ui";
import { describeMoveEffects } from "@/domain/mechanics/moveEffects";
import { defensiveChart } from "@/domain/mechanics/typeEffectiveness";
import { POKEMON_TYPES, STAT_KEYS } from "@/domain/types/pokemon";
import { getPokemonBySlug } from "@/server/repositories/pokemonRepo";

export const dynamic = "force-dynamic";

const STAT_LABELS: Record<(typeof STAT_KEYS)[number], string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

function multiplierLabel(m: number): { text: string; cls: string } {
  if (m === 0) return { text: "0×", cls: "text-slate-500" };
  if (m < 1) return { text: `${m}×`, cls: "text-emerald-400" };
  if (m === 1) return { text: "1×", cls: "text-slate-400" };
  return { text: `${m}×`, cls: "text-rose-400" };
}

/** Colour a base stat by tier: red low → light-blue extremely high. */
function statBarColor(v: number): string {
  if (v < 60) return "bg-red-500"; // low
  if (v < 80) return "bg-yellow-500"; // normal but low
  if (v < 100) return "bg-green-500"; // average
  if (v < 130) return "bg-green-700"; // high
  return "bg-sky-400"; // extremely high
}

export default async function PokemonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getPokemonBySlug(slug);
  if (!p) notFound();

  const chart = defensiveChart(p.types);

  return (
    <div className="space-y-6">
      <Link href="/pokemon" className="text-sm text-amber-400 hover:underline">
        ← Pokédex
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{p.name}</h1>
        <div className="flex gap-1">
          {p.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Base stats">
          <ul className="space-y-1 text-sm">
            {STAT_KEYS.map((k) => (
              <li key={k} className="flex items-center gap-3">
                <span className="w-10 text-slate-400">{STAT_LABELS[k]}</span>
                <span className="w-10 tabular-nums">{p.baseStats[k]}</span>
                <span className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
                  <span
                    className={`block h-full ${statBarColor(p.baseStats[k])}`}
                    style={{ width: `${Math.min(100, (p.baseStats[k] / 255) * 100)}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Defensive type matchups">
          <div className="grid grid-cols-3 gap-1 text-xs sm:grid-cols-4">
            {POKEMON_TYPES.map((t) => {
              const l = multiplierLabel(chart[t]);
              return (
                <div
                  key={t}
                  className="flex items-center justify-between rounded bg-slate-800/50 px-2 py-1"
                >
                  <span className="capitalize text-slate-400">{t}</span>
                  <span className={l.cls}>{l.text}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel title="Abilities">
        <div className="flex flex-wrap gap-2">
          {p.abilities.map((a) => (
            <span
              key={a}
              className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-200"
            >
              {a}
            </span>
          ))}
        </div>
      </Panel>

      <Panel title="Moves">
        <p className="mb-2 text-xs text-slate-500">
          {p.moves.length} moves with battle data. Columns follow the
          pokemondb.net layout. Legal = present in this species&rsquo; legal
          movepool.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-1">Name</th>
                <th>Type</th>
                <th>Cat.</th>
                <th className="text-right">Power</th>
                <th className="text-right">Acc.</th>
                <th className="text-right">PP</th>
                <th>Effect</th>
                <th>Legal</th>
              </tr>
            </thead>
            <tbody>
              {p.moves.map((m) => {
                const effects = describeMoveEffects(m);
                const legal = p.movepool.includes(m.name);
                return (
                  <tr key={m.name} className="border-t border-slate-800">
                    <td className="py-1">{m.name}</td>
                    <td>
                      <TypeBadge type={m.type} />
                    </td>
                    <td className="capitalize text-slate-400">{m.category}</td>
                    <td className="text-right tabular-nums">{m.power ?? "—"}</td>
                    <td className="text-right tabular-nums">
                      {m.accuracy === null ? "—" : m.accuracy}
                    </td>
                    <td className="text-right tabular-nums text-slate-600">—</td>
                    <td>
                      {effects.length > 0 ? (
                        <span className="flex flex-wrap gap-1">
                          {effects.map((e) => (
                            <span
                              key={e}
                              className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300"
                            >
                              {e}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td>
                      {legal ? (
                        <span className="text-emerald-400">Legal</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-600">
          Effect column is provisional (mainline-derived); PP not yet in dataset.
        </p>
      </Panel>

      <Panel title="Full movepool">
        <p className="mb-2 text-xs text-slate-500">{p.movepool.length} legal moves.</p>
        <details>
          <summary className="cursor-pointer text-sm text-amber-400">
            Show all {p.movepool.length}
          </summary>
          <div className="mt-2 flex flex-wrap gap-1">
            {p.movepool.map((m) => (
              <span
                key={m}
                className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300"
              >
                {m}
              </span>
            ))}
          </div>
        </details>
      </Panel>
    </div>
  );
}
