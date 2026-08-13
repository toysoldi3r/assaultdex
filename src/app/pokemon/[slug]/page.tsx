import Link from "next/link";
import { notFound } from "next/navigation";
import { Dex } from "@pkmn/dex";
import { Panel, TypeBadge } from "@/components/ui";
import { changeHistory, speciesMeta } from "@/data/pkmnEnrich";
import { PokeIcon } from "@/components/PokeIcon";
import { ItemIcon } from "@/components/ItemIcon";
import { getDexSpecies, getSpeciesForms } from "@/data/pokedexSource";
import { CHAMPIONS_FORMAT_LABEL, getMonUsage } from "@/data/usageStats";
import { suggestSets, type MegaInfo } from "@/data/suggestSets";
import { defensiveChart } from "@/domain/mechanics/typeEffectiveness";
import { statColor } from "@/domain/mechanics/statColor";
import { POKEMON_TYPES, STAT_KEYS, STAT_LABELS, type PokemonType } from "@/domain/types/pokemon";

export const dynamic = "force-dynamic";

/** Colour the whole matchup card by effectiveness: white 1×, red 2×+, green
 *  resisted (0.5× / 0.25×), black immune (0×). */
function matchupCard(m: number): { text: string; card: string } {
  if (m === 0) return { text: "0×", card: "bg-black text-white" };
  if (m >= 2) return { text: `${m}×`, card: "bg-rose-600 text-white" };
  if (m < 1) return { text: `${m}×`, card: "bg-emerald-600 text-white" };
  return { text: "1×", card: "bg-white text-slate-900" };
}

/** Mega/Primal forme (stone + forme ability), for a Mega suggested set. */
function megaInfo(slug: string): MegaInfo | null {
  const s = Dex.species.get(slug);
  if (!s.exists) return null;
  for (const fn of s.otherFormes ?? []) {
    const f = Dex.species.get(fn);
    if (f.exists && /Mega|Primal/.test(f.forme) && f.requiredItem) {
      return {
        stone: f.requiredItem,
        ability: (Object.values(f.abilities)[0] as string) ?? "",
        label: f.forme,
      };
    }
  }
  return null;
}


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getDexSpecies(slug);
  return p
    ? {
        title: p.name,
        description: `${p.name} (#${p.num}) - ${p.types.join("/")} type. Base stats, abilities, defensive matchups, and legal moves for Pokémon Champions.`,
      }
    : { title: "Pokémon", description: "Pokémon reference for Pokémon Champions." };
}

export default async function PokemonPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ form?: string }>;
}) {
  const { slug } = await params;
  const { form } = await searchParams;
  const forms = getSpeciesForms(slug);
  // The route may arrive as a base id or a forme id (e.g. a teammate deep-link).
  // Anchor the switcher to the true base and resolve which form to render.
  const baseSlug = forms.find((f) => f.isBase)?.id ?? slug;
  const target =
    form && forms.some((f) => f.id === form)
      ? form
      : forms.some((f) => f.id === slug)
        ? slug
        : baseSlug;
  const p = await getDexSpecies(target);
  if (!p) notFound();

  const chart = defensiveChart(p.types);
  const meta = speciesMeta(p.name, p.abilities);
  const history = changeHistory(p.name);
  const usage = await getMonUsage(p.name);
  const mega = megaInfo(target);
  const sets = suggestSets(p.types, p.baseStats, p.abilities, p.moves, mega ?? undefined);
  const moveType = new Map<string, PokemonType>(
    p.moves.flatMap((m) => (m.type ? [[m.name, m.type] as [string, PokemonType]] : [])),
  );

  return (
    <div className="space-y-6">
      <Link href="/pokemon" className="text-sm text-amber-400 hover:underline">
        ← Pokédex
      </Link>

      <div className="flex items-center gap-4">
        <span className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded bg-slate-800/50">
          <PokeIcon species={p.name} className="scale-[2.6]" />
        </span>
        <div>
          <span className="tabular-nums text-sm text-slate-500">
            #{String(p.num).padStart(4, "0")}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{p.name}</h1>
            <span className="flex gap-1">
              {p.types.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </span>
          </div>
          {meta && (
            <span className="text-xs text-slate-400">{meta.genderLabel}</span>
          )}
          {usage && (
            <span className="mt-1 block text-xs text-slate-400">
              {CHAMPIONS_FORMAT_LABEL}:{" "}
              <span className="text-amber-300">{usage.usage}%</span> usage ·{" "}
              {usage.winRate}% win rate
            </span>
          )}
        </div>
      </div>

      {forms.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {forms.map((f) => {
            const active = target === f.id;
            const href = f.isBase
              ? `/pokemon/${baseSlug}`
              : `/pokemon/${baseSlug}?form=${f.id}`;
            return (
              <Link
                key={f.id}
                href={href}
                scroll={false}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  active
                    ? "bg-amber-500 text-black"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Base stats">
          <ul className="space-y-1 text-sm">
            {STAT_KEYS.map((k) => (
              <li key={k} className="flex items-center gap-3">
                <span className="w-10 text-slate-400">{STAT_LABELS[k]}</span>
                <span className="w-10 tabular-nums">{p.baseStats[k]}</span>
                <span className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
                  <span
                    className="block h-full"
                    style={{
                      width: `${Math.min(100, (p.baseStats[k] / 255) * 100)}%`,
                      backgroundColor: statColor(p.baseStats[k]),
                    }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Defensive type matchups">
          <div className="grid grid-cols-2 gap-1 text-xs sm:grid-cols-3">
            {POKEMON_TYPES.map((t) => {
              const l = matchupCard(chart[t]);
              return (
                <div
                  key={t}
                  className={`flex items-center justify-between gap-1 rounded px-2 py-1 ${l.card}`}
                >
                  <TypeBadge type={t} />
                  <span className="font-semibold">{l.text}</span>
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
      </Panel>

      <Panel title="Suggested sets">
        <p className="mb-3 text-[10px] uppercase tracking-wide text-slate-600">
          Archetype suggestions from base stats + movepool (heuristic, not scraped usage).
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {sets.map((s) => (
            <div key={s.label} className="rounded-lg border border-slate-800 bg-slate-800/30 p-3 text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold text-amber-300">{s.label}</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <ItemIcon item={s.item} />{s.item}
                </span>
              </div>
              <p className="text-slate-400">
                {s.ability} · {s.nature}
              </p>
              <p className="text-slate-500">
                EVs: {Object.entries(s.evs).map(([k, v]) => `${v} ${STAT_LABELS[k as keyof typeof STAT_LABELS]}`).join(" / ")}
                {s.ivs.atk === 0 ? " · 0 Atk IV" : ""}
              </p>
              <ul className="mt-1 space-y-0.5">
                {s.moves.map((mv) => (
                  <li key={mv} className="flex items-center gap-1">
                    {moveType.get(mv) && <TypeBadge type={moveType.get(mv)!} />}
                    <span>{mv}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      {usage && usage.teammates.length > 0 && (
        <Panel title={`Common teammates · ${CHAMPIONS_FORMAT_LABEL}`}>
          <ul className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
            {usage.teammates.map((t) => (
              <li key={t.key}>
                <Link
                  href={`/pokemon/${t.key}`}
                  className="flex items-center justify-between rounded bg-slate-800/50 px-2 py-1 hover:bg-slate-800 hover:text-amber-300"
                >
                  <span className="truncate">{t.name}</span>
                  <span className="ml-2 shrink-0 tabular-nums text-slate-400">
                    {t.pct}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-600">
            Share of this Pokémon&rsquo;s ranked teams that also ran each
            partner (aggregated from competitive ladder replays).
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
                  <td>{m.type ? <TypeBadge type={m.type} /> : "-"}</td>
                  <td className="capitalize text-slate-400">{m.category}</td>
                  <td className="text-right tabular-nums">{m.power ?? "-"}</td>
                  <td className="text-right tabular-nums">
                    {m.accuracy === null ? "-" : m.accuracy}
                  </td>
                  <td className="text-right tabular-nums">{m.pp ?? "-"}</td>
                  <td>
                    {m.effect ? (
                      <span className="text-xs text-slate-300">{m.effect}</span>
                    ) : (
                      <span className="text-slate-600">-</span>
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
    </div>
  );
}
