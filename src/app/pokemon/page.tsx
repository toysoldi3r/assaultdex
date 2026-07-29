import Link from "next/link";
import { Panel, TypeBadge } from "@/components/ui";
import { searchPokemon } from "@/server/repositories/pokemonRepo";

export const dynamic = "force-dynamic";

export default async function PokedexPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = await searchPokemon(q);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pokédex</h1>

      <form method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
        >
          Search
        </button>
      </form>

      {results.length === 0 ? (
        <Panel>
          <p className="text-sm text-slate-400">
            {q
              ? `No Pokémon match “${q}”.`
              : "No Pokémon imported yet. Run the seed: pnpm db:seed."}
          </p>
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <Link
              key={p.slug}
              href={`/pokemon/${p.slug}`}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 hover:border-amber-500/60"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{p.name}</span>
                <div className="flex gap-1">
                  {p.types.map((t) => (
                    <TypeBadge key={t} type={t} />
                  ))}
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                BST{" "}
                {Object.values(p.baseStats).reduce((a, b) => a + b, 0)} ·{" "}
                {p.provenance.provider}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
