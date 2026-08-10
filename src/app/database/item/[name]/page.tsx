import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemIcon } from "@/components/ItemIcon";
import { PokeIcon } from "@/components/PokeIcon";
import { getDbItem } from "@/data/dexDatabase";
import { itemHolders, hasTournamentData } from "@/data/tournamentStats";
import { listPokemon } from "@/server/repositories/pokemonRepo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const item = getDbItem(decodeURIComponent(name));
  return { title: item ? `${item.name} - AssaultDex` : "Item - AssaultDex" };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const item = getDbItem(decodeURIComponent(name));
  if (!item) notFound();

  // Champions Pokémon that commonly hold this item, derived from the tournament
  // snapshot. Map holder names to pool slugs so we can link + show sprites.
  const [holders, pool] = await Promise.all([
    Promise.resolve(itemHolders(item.name)),
    listPokemon(),
  ]);
  const slugByName = new Map(pool.map((p) => [p.name, p.slug]));
  const topHolders = holders.slice(0, 12);
  // Approximate share of teams running this item (mon usage × item share).
  const popularity = holders.reduce((s, h) => s + (h.monUsage * h.pct) / 100, 0);

  return (
    <div className="space-y-6">
      <Link href="/database?tab=items" className="text-sm text-amber-400 hover:underline">
        &larr; Database
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded bg-slate-800/50">
          <ItemIcon item={item.name} />
        </span>
        <h1 className="text-2xl font-bold">{item.name}</h1>
        {item.competitive && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
            Commonly used
          </span>
        )}
      </div>

      <section className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Effect</h2>
        <p className="text-slate-300">{item.desc}</p>
        {item.calc && (
          <p className="text-xs text-emerald-300">
            <span className="font-semibold">Modeled calculation:</span> {item.calc}
          </p>
        )}
        {item.fling != null && (
          <p className="text-xs text-slate-400">
            Fling base power: <span className="tabular-nums">{item.fling}</span>
          </p>
        )}
      </section>

      {item.interaction && (
        <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">Special interactions</h2>
          <p className="text-sm text-amber-200/90">{item.interaction}</p>
        </section>
      )}

      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Competitive usage</h2>
          {topHolders.length > 0 && (
            <span className="text-xs text-slate-500">
              ~{popularity.toFixed(1)}% of teams run it &middot; {holders.length} Pokémon
            </span>
          )}
        </div>

        {topHolders.length > 0 ? (
          <>
            <p className="mb-3 text-xs text-slate-500">
              Most common holders (share of that Pokémon&apos;s sets):
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {topHolders.map((h) => {
                const slug = slugByName.get(h.name);
                const inner = (
                  <>
                    <PokeIcon species={h.name} />
                    <span className="min-w-0 flex-1 truncate">{h.name}</span>
                    <span className="tabular-nums text-slate-400">{h.pct}%</span>
                  </>
                );
                return slug ? (
                  <Link
                    key={h.name}
                    href={`/pokemon/${slug}`}
                    className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900/40 px-2 py-1 text-sm hover:border-amber-500"
                  >
                    {inner}
                  </Link>
                ) : (
                  <span key={h.name} className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900/40 px-2 py-1 text-sm">
                    {inner}
                  </span>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-wide text-slate-600">
              Derived from the committed Champions tournament snapshot (open team sheets).
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-400">
            {hasTournamentData()
              ? "No Pokémon in the tournament snapshot run this item."
              : "Tournament usage data (common holders and popularity) is not loaded in this build yet. It appears automatically once the Champions tournament snapshot is refreshed."}
          </p>
        )}
      </section>
    </div>
  );
}
