import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel, TypeBadge } from "@/components/ui";
import { changeHistory, speciesMeta } from "@/data/pkmnEnrich";
import { getDbAbility } from "@/data/dexDatabase";
import { PokemonArt } from "@/components/PokemonArt";
import { PokeIcon } from "@/components/PokeIcon";
import { ItemIcon } from "@/components/ItemIcon";
import { PokemonTypeMatchups } from "@/components/PokemonTypeMatchups";
import { MovesCard } from "@/components/MovesCard";
import {
  getDexSpecies,
  getSpeciesForms,
  getSpeciesTypes,
  moveTypeByName,
} from "@/data/pokedexSource";
import {
  getPokedexFlavor,
  LANGUAGE_LABELS,
  versionLabel,
} from "@/data/pokedexFlavor";
import {
  CHAMPIONS_FORMAT_LABEL,
  getMonUsage,
  getUsageRank,
  getRankedCount,
} from "@/data/usageStats";
import { getMonTournament, type TournEntry } from "@/data/tournamentStats";
import { suggestSets } from "@/data/suggestSets";
import { statColor } from "@/domain/mechanics/statColor";
import { STAT_KEYS, STAT_LABELS, type PokemonType } from "@/domain/types/pokemon";

export const dynamic = "force-dynamic";

/** Link an ability to its reference page when one exists in the database. */
function abilityHref(name: string): string | null {
  return getDbAbility(name) ? `/database/ability/${encodeURIComponent(name)}` : null;
}

/** A ranked percentage bar list (abilities / items / natures / moves usage). */
function UsageBars({ rows, showType }: { rows: TournEntry[]; showType?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.pct));
  return (
    <ul className="space-y-1">
      {rows.map((r) => {
        const ty = showType ? moveTypeByName(r.name) : null;
        return (
          <li key={r.name} className="flex items-center gap-2 text-xs">
            {ty && <TypeBadge type={ty} />}
            <span className="w-28 shrink-0 truncate text-slate-300" title={r.name}>{r.name}</span>
            <span className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
              <span className="block h-full bg-amber-500" style={{ width: `${(r.pct / max) * 100}%` }} />
            </span>
            <span className="w-12 shrink-0 text-right tabular-nums text-slate-400">{r.pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}

/** One usage category: ranked % bars when the snapshot has data, otherwise a
 *  dash placeholder (or the known option names with dashes, e.g. abilities). */
function UsageSection({
  title,
  rows,
  showType,
  fallbackNames,
}: {
  title: string;
  rows?: TournEntry[];
  showType?: boolean;
  fallbackNames?: string[];
}) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-300">{title}</h3>
      {rows && rows.length > 0 ? (
        <UsageBars rows={rows} showType={showType} />
      ) : fallbackNames && fallbackNames.length > 0 ? (
        <ul className="space-y-1">
          {fallbackNames.map((n) => (
            <li key={n} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-slate-300">{n}</span>
              <span className="tabular-nums text-slate-500">—</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">—</p>
      )}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getDexSpecies(slug);
  return p
    ? {
        title: p.name,
        description: `${p.name} (#${p.num}) - ${p.types.join("/")} type. Base stats, abilities, type matchups, and legal moves for Pokémon Champions.`,
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

  const meta = speciesMeta(p.name, p.abilities);
  const history = changeHistory(p.name);
  const usage = await getMonUsage(p.name);
  const rank = getUsageRank(p.name);
  const rankedCount = getRankedCount();
  const tourn = getMonTournament(p.name);
  // Competitive usage % by move name, for the Moves card's popularity sort.
  const moveUsage: Record<string, number> = {};
  for (const r of tourn?.moves ?? []) moveUsage[r.name] = r.pct;
  const sets = suggestSets(p.types, p.baseStats, p.abilities, p.moves);
  const flavor = getPokedexFlavor(target) ?? getPokedexFlavor(baseSlug);
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
          <PokemonArt slug={target} name={p.name} size={112} />
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
          {flavor?.genus && (
            <span className="block text-sm text-slate-300">{flavor.genus}</span>
          )}
          {meta && <span className="text-xs text-slate-400">{meta.genderLabel}</span>}
          <span className="mt-1 block text-xs text-slate-400">
            {CHAMPIONS_FORMAT_LABEL}:{" "}
            <span
              className="text-amber-300"
              title={rank ? `Usage rank ${rank} of ${rankedCount}` : "Not ranked on the ladder"}
            >
              #{rank ?? "—"}
            </span>
            {usage ? (
              <>
                {" "}· <span className="text-amber-300">{usage.usage}%</span> usage ·{" "}
                {usage.winRate}% win rate
              </>
            ) : (
              <> · not on the ladder</>
            )}
          </span>
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
          <table className="w-full text-sm">
            <tbody>
              {STAT_KEYS.map((k) => (
                <tr key={k}>
                  <td className="py-1 pr-2 text-slate-400">{STAT_LABELS[k]}</td>
                  <td className="py-1 pr-3 text-right tabular-nums">{p.baseStats[k]}</td>
                  <td className="w-full py-1">
                    <span className="block h-2 overflow-hidden rounded bg-slate-800">
                      <span className="block h-full" style={{ width: `${Math.min(100, (p.baseStats[k] / 255) * 100)}%`, backgroundColor: statColor(p.baseStats[k]) }} />
                    </span>
                  </td>
                  <td className="py-1 pl-3 text-right tabular-nums text-slate-400">{p.statRanges[k].min}</td>
                  <td className="py-1 pl-3 text-right tabular-nums text-slate-400">{p.statRanges[k].max}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-800">
                <td className="py-1 pr-2 font-semibold text-slate-300">Total</td>
                <td className="py-1 pr-3 text-right font-bold tabular-nums">{STAT_KEYS.reduce((s, k) => s + p.baseStats[k], 0)}</td>
                <td />
                <td className="py-1 pl-3 text-right text-[10px] uppercase text-slate-500">Min</td>
                <td className="py-1 pl-3 text-right text-[10px] uppercase text-slate-500">Max</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-[10px] leading-snug text-slate-500">
            The ranges on the right are for a level 100 Pokémon. Max = beneficial nature,
            252 EVs, 31 IVs; Min = hindering nature, 0 EVs, 0 IVs.
          </p>
        </Panel>

        <PokemonTypeMatchups types={p.types} abilities={p.abilities} />
      </div>

      <Panel title="Abilities">
        {meta ? (
          <ul className="space-y-2">
            {meta.abilities.map((a) => {
              const href = abilityHref(a.name);
              const inner = (
                <>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${href ? "text-amber-300" : "text-slate-100"}`}>{a.name}</span>
                    {a.hidden && (
                      <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
                        Hidden
                      </span>
                    )}
                    {href && <span className="ml-auto text-xs text-slate-500">→</span>}
                  </div>
                  {a.effect && <p className="mt-0.5 text-xs text-slate-400">{a.effect}</p>}
                </>
              );
              // The whole sub-card links to the ability page when one exists.
              return href ? (
                <li key={a.name}>
                  <Link href={href} className="block rounded bg-slate-800/50 px-3 py-2 hover:bg-slate-800 hover:ring-1 hover:ring-amber-500/40">
                    {inner}
                  </Link>
                </li>
              ) : (
                <li key={a.name} className="rounded bg-slate-800/50 px-3 py-2">{inner}</li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-wrap gap-2">
            {p.abilities.map((a) => {
              const href = abilityHref(a);
              return href ? (
                <Link
                  key={a}
                  href={href}
                  className="rounded bg-slate-800 px-2 py-1 text-sm text-amber-300 hover:underline"
                >
                  {a}
                </Link>
              ) : (
                <span key={a} className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-200">
                  {a}
                </span>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title={`Usage details · ${CHAMPIONS_FORMAT_LABEL}`}>
        <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
          <UsageSection title="Most common items" rows={tourn?.items} />
          <UsageSection title="Most common abilities" rows={tourn?.abilities} fallbackNames={p.abilities} />
          <UsageSection title="Most common natures" rows={tourn?.natures} />
          <UsageSection title="Most common EV spreads" rows={tourn?.spreads} />
          <UsageSection title="Most common moves" rows={tourn?.moves} showType />
        </div>
        <p className="mt-3 text-[10px] uppercase tracking-wide text-slate-600">
          {tourn
            ? `Share of open tournament team sheets (${tourn.usage}% of the field ran ${p.name}).`
            : "— shown where no usage snapshot is loaded yet. Populate it with `pnpm refresh:tournaments` (needs a reachable source)."}
        </p>
      </Panel>

      <Panel title="Height & weight">
        <div className="flex flex-wrap gap-6 text-sm">
          <span>
            <span className="text-slate-500">Height </span>
            {flavor?.heightM ? `${flavor.heightM.toFixed(1)} m` : "—"}
          </span>
          <span>
            <span className="text-slate-500">Weight </span>
            {p.weightKg ? `${p.weightKg.toFixed(1)} kg` : "—"}
          </span>
        </div>
      </Panel>

      {flavor?.names && flavor.names.length > 0 && (
        <Panel title="Names in other languages">
          <ul className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
            {flavor.names.map((n) => (
              <li key={`${n.lang}-${n.name}`} className="flex items-center justify-between gap-2 rounded bg-slate-800/50 px-2 py-1">
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  {LANGUAGE_LABELS[n.lang] ?? n.lang}
                </span>
                <span className="truncate">{n.name}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {flavor?.entries && flavor.entries.length > 0 && (
        <Panel title="Pokédex entries">
          <ul className="space-y-2 text-sm">
            {flavor.entries.map((e) => (
              <li key={e.version} className="flex gap-3">
                <span className="w-28 shrink-0 text-xs uppercase tracking-wide text-slate-500">
                  {versionLabel(e.version)}
                </span>
                <span className="text-slate-300">{e.text}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

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
          <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            {usage.teammates.map((t) => {
              const types = getSpeciesTypes(t.key);
              return (
                <li key={t.key}>
                  <Link
                    href={`/pokemon/${t.key}`}
                    className="flex items-center gap-2 rounded bg-slate-800/50 px-2 py-1 hover:bg-slate-800 hover:text-amber-300"
                  >
                    <PokeIcon species={t.name} title="" />
                    <span className="truncate">{t.name}</span>
                    <span className="flex gap-0.5">
                      {types.map((ty) => (
                        <TypeBadge key={ty} type={ty} />
                      ))}
                    </span>
                    <span className="ml-auto shrink-0 tabular-nums text-slate-400">{t.pct}%</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-600">
            Share of this Pokémon&rsquo;s ranked teams that also ran each
            partner (aggregated from competitive ladder replays).
          </p>
        </Panel>
      )}

      <Panel title="Moves">
        <MovesCard rows={p.moves} usage={moveUsage} count={p.moves.length} />
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
