import Link from "next/link";
import { notFound } from "next/navigation";
import { getDbAbility, pokemonWithAbility, abilityAffectedMoves } from "@/data/dexDatabase";
import { AbilityPokemonList } from "@/components/database/AbilityPokemonList";
import { listPokemon } from "@/server/repositories/pokemonRepo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const ability = getDbAbility(decodeURIComponent(name));
  return ability
    ? { title: ability.name, description: ability.desc || `${ability.name} - ability reference for Pokémon Champions.` }
    : { title: "Ability", description: "Ability reference for Pokémon Champions." };
}

export default async function AbilityPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const ability = getDbAbility(decodeURIComponent(name));
  if (!ability) notFound();

  const [mons, champs] = await Promise.all([
    Promise.resolve(pokemonWithAbility(ability.name)),
    listPokemon(),
  ]);
  const championsSlugs = champs.map((p) => p.slug);
  const affectedMoves = abilityAffectedMoves(ability.name);

  return (
    <div className="space-y-6">
      <Link href="/database" className="text-sm text-amber-400 hover:underline">
        ← Database
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{ability.name}</h1>
        {ability.rating > 0 && (
          <span className="text-xs text-slate-500">competitive rating {ability.rating}</span>
        )}
      </div>

      <section className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <p className="text-sm text-slate-300">{ability.desc}</p>
        {ability.calc && (
          <p className="text-xs text-emerald-300">
            <span className="font-semibold">Calculation:</span> {ability.calc}
          </p>
        )}
        {ability.interaction && (
          <p className="rounded bg-slate-800/40 px-2 py-1 text-xs text-amber-200/90">
            <span className="font-semibold">Special interaction:</span> {ability.interaction}
          </p>
        )}
      </section>

      {affectedMoves.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Affected moves ({affectedMoves.length})
          </h2>
          <div className="flex flex-wrap gap-1">
            {affectedMoves.map((m) => (
              <span key={m} className="rounded bg-slate-800/60 px-2 py-0.5 text-xs text-slate-300">{m}</span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Pokémon with {ability.name}
        </h2>
        <AbilityPokemonList mons={mons} championsSlugs={championsSlugs} />
      </section>
    </div>
  );
}
