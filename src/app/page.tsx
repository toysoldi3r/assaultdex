import Link from "next/link";
import { MetaCards } from "@/components/home/MetaCards";
import { listPokemon } from "@/server/repositories/pokemonRepo";
import type { PokemonType } from "@/domain/types/pokemon";
import { listDbItems } from "@/data/dexDatabase";
import {
  getCores,
  getTopTeams,
  getTotalBattles,
  topByTeams,
  topMeta,
  topWinRate,
} from "@/data/usageStats";

const uKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
// Locale-independent grouping so it matches the client-rendered numbers.
const grouped = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// ISR: data is static (committed usage snapshot + build-time seed), so render
// once and regenerate hourly instead of on every request. A re-seed shows after
// the next revalidate (or a redeploy).
export const revalidate = 3600;

export default async function HomePage() {
  const pokemon = await listPokemon();
  const typesByKey: Record<string, PokemonType[]> = Object.fromEntries(
    pokemon.map((p) => [uKey(p.name), p.types]),
  );

  const totalBattles = getTotalBattles();
  // Legal moves = distinct moves across every Champions mon's legal movepool.
  const legalMoves = new Set(pokemon.flatMap((p) => p.movepool)).size;
  const legalItems = listDbItems().length;
  const stats = [
    { value: grouped(totalBattles), label: "Battles in snapshot" },
    { value: String(pokemon.length), label: "Valid pokemons", href: "/pokemon" },
    { value: grouped(legalMoves), label: "Legal moves", href: "/database?tab=moves" },
    { value: grouped(legalItems), label: "Legal items" },
    { value: "Reg M-B", label: "Format · Bo3" },
  ];

  const banners = [
    { href: "/teams", label: "New team" },
    { href: "/choicedex", label: "Open ChoiceDex" },
    { href: "/database?tab=calc", label: "Damage calc" },
  ];

  return (
    <>
      {/* Banner */}
      <div
        className="flex flex-col gap-3 rounded-lg border border-line bg-panel px-[18px] py-3.5 md:flex-row md:flex-wrap md:items-center md:gap-[18px]"
        style={{ borderLeft: "2px solid var(--accln)" }}
      >
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-semibold text-t1">Decision support for Champions doubles</h1>
          <p className="mt-[3px] text-[13px] text-t2">
            235 species, a committed ladder snapshot, and provisional mechanics flagged wherever they appear.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {banners.map((b) => (
            <Link
              key={b.href}
              href={b.href}
              className="rounded-md border border-line px-3 py-[7px] text-xs font-medium text-t1 hover:border-accln"
            >
              {b.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-line sm:grid-cols-3 lg:grid-cols-5" style={{ gap: 1, background: "var(--line)" }}>
        {stats.map((s) =>
          s.href ? (
            <Link
              key={s.label}
              href={s.href}
              className="group bg-panel px-3.5 py-[11px] transition-colors hover:bg-soft"
            >
              <div className="mono text-[18px] font-bold text-t1 group-hover:text-acc">{s.value}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.06em] text-t3">{s.label}</div>
            </Link>
          ) : (
            <div key={s.label} className="bg-panel px-3.5 py-[11px]">
              <div className="mono text-[18px] font-bold text-t1">{s.value}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.06em] text-t3">{s.label}</div>
            </div>
          ),
        )}
      </div>

      <MetaCards
        usage={topMeta(20)}
        winrate={topWinRate(20, 3)}
        byTeams={topByTeams(20)}
        teams={getTopTeams(10)}
        cores2={getCores(2, 10)}
        cores3={getCores(3, 10)}
        cores4={getCores(4, 10)}
        totalBattles={totalBattles}
        typesByKey={typesByKey}
      />
    </>
  );
}
