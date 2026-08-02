import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel, TypeBadge } from "@/components/ui";
import { changeHistory, speciesMeta, spriteUrl } from "@/data/pkmnEnrich";
import { getDexSpecies } from "@/data/pokedexSource";
import { defensiveChart } from "@/domain/mechanics/typeEffectiveness";
import { POKEMON_TYPES, STAT_KEYS } from "@/domain/types/pokemon";

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
  const p = await getDexSpecies(slug);
  if (!p) notFound();

  const chart = defensiveChart(p.types);
  const meta = speciesMeta(p.name, p.abilities);
  const history = changeHistory(p.name);

  return (
    <div className="space-y-6">
      <Link href="/pokemon" className="text-sm text-amber-400 hover:underline">
        ← Pokédex
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {meta && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={spriteUrl(meta.spriteId)}
              alt={p.name}
              width={96}
              height={96}
              className="h-24 w-24 shrink-0 [image-rendering:pixelated]"
            />
          )}
          <div>
            <span className="tabular-nums text-sm text-slate-500">
              #{String(p.num).padStart(4, "0")}
            </span>
            <h1 className="text-2xl font-bold">{p.name}</h1>
            {meta && (
              <span className="text-xs text-slate-400">{meta.genderLabel}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
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
        {meta ? (
          <ul className="space-y-2">
            {meta.abilities.map((a) => (
              <li key={a.name} className="rounded bg-slate-800/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">{a.name}</span>
                  {a.hidden && (
                    <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
                      Hidden
                    </span>
                  )}
                </div>
                {a.effect && (
                  <p className="mt-0.5 text-xs text-slate-400">{a.effect}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
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
        )}
        <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-600">
          Competitive usage % pending a usage dataset.
        </p>
      </Panel>

      {meta && (
        <Panel title="Competitive change history">
          <details>
            <summary className="cursor-pointer text-sm text-amber-400">
              {history.length > 0
                ? `${history.length} generation${history.length > 1 ? "s" : ""} with changes`
                : "No competitively significant changes since introduction"}
            </summary>
            {history.length > 0 && (
              <ul className="mt-2 space-y-2">
                {history.map((h) => (
                  <li key={h.gen} className="flex gap-3 text-sm">
                    <span className="w-14 shrink-0 font-semibold text-slate-400">
                      Gen {h.gen}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {h.changes.map((c) => (
                        <span
                          key={c}
                          className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300"
                        >
                          {c}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>
          <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-600">
            Base-stat, typing, and ability revisions across generations
            (@pkmn/dex).
          </p>
        </Panel>
      )}

      <Panel title="Moves">
        <p className="mb-2 text-xs text-slate-500">
          {p.moves.length} Gen 9-legal moves. Columns follow the pokemondb.net
          layout; all listed moves are legal in the current format.
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
              {p.moves.map((m) => (
                <tr key={m.name} className="border-t border-slate-800">
                  <td className="py-1">{m.name}</td>
                  <td>{m.type ? <TypeBadge type={m.type} /> : "—"}</td>
                  <td className="capitalize text-slate-400">{m.category}</td>
                  <td className="text-right tabular-nums">{m.power ?? "—"}</td>
                  <td className="text-right tabular-nums">
                    {m.accuracy === null ? "—" : m.accuracy}
                  </td>
                  <td className="text-right tabular-nums">{m.pp ?? "—"}</td>
                  <td>
                    {m.effect ? (
                      <span className="text-xs text-slate-300">{m.effect}</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td>
                    <span className="text-emerald-400">Legal</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-600">
          Move data from @pkmn/dex; usage % pending a usage dataset.
        </p>
      </Panel>
    </div>
  );
}
