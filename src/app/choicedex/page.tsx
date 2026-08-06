import { Dex } from "@pkmn/dex";
import Link from "next/link";
import { Panel, ProvisionalTag } from "@/components/ui";
import { OnceTutorial } from "@/components/OnceTutorial";
import { ChoiceDexApp, type KnownSet, type SavedTeam } from "@/components/choicedex/ChoiceDexApp";
import { HitInference, type Variant } from "@/components/choicedex/HitInference";
import { OpponentInference } from "@/components/choicedex/OpponentInference";
import { Simulator } from "@/components/choicedex/Simulator";
import type { PokemonRef } from "@/lib/choicedexBuild";
import { POKEMON_TYPES, type PokemonType, type StatKey } from "@/domain/types/pokemon";
import { listPokemon } from "@/server/repositories/pokemonRepo";
import { listTeams } from "@/server/repositories/teamRepo";
import { itemCatalog } from "@/data/catalog";

const STAT_KEYS_ORDER: StatKey[] = ["hp", "atk", "def", "spa", "spd", "spe"];

/** Battle formes (Mega / Primal / Aegislash-Blade …) per pool species. */
function buildVariants(refs: PokemonRef[]): Record<string, Variant[]> {
  const mapTypes = (arr: readonly string[]): PokemonType[] =>
    arr
      .map((t) => t.toLowerCase())
      .filter((t): t is PokemonType => (POKEMON_TYPES as readonly string[]).includes(t));
  const bs = (b: Record<StatKey, number>) =>
    Object.fromEntries(STAT_KEYS_ORDER.map((k) => [k, b[k]])) as Record<StatKey, number>;

  const out: Record<string, Variant[]> = {};
  for (const p of refs) {
    const s = Dex.species.get(p.slug);
    if (!s.exists) continue;
    const extra: Variant[] = [];
    for (const fn of s.otherFormes ?? []) {
      const f = Dex.species.get(fn);
      if (!f.exists) continue;
      if (/Mega|Primal/.test(f.forme) || f.battleOnly) {
        extra.push({ label: f.forme, baseStats: bs(f.baseStats), types: mapTypes(f.types) });
      }
    }
    if (extra.length) out[p.slug] = [{ label: "Base", baseStats: p.baseStats, types: p.types }, ...extra];
  }
  return out;
}

/** Mega / Primal formes per pool species, for the in-battle Mega button. */
function buildMegaForms(
  refs: PokemonRef[],
): Record<string, { name: string; baseStats: Record<StatKey, number>; types: PokemonType[]; ability: string; item: string }> {
  const mapTypes = (arr: readonly string[]): PokemonType[] =>
    arr.map((t) => t.toLowerCase()).filter((t): t is PokemonType => (POKEMON_TYPES as readonly string[]).includes(t));
  const bs = (b: Record<StatKey, number>) =>
    Object.fromEntries(STAT_KEYS_ORDER.map((k) => [k, b[k]])) as Record<StatKey, number>;

  const out: Record<string, { name: string; baseStats: Record<StatKey, number>; types: PokemonType[]; ability: string; item: string }> = {};
  for (const p of refs) {
    const s = Dex.species.get(p.slug);
    if (!s.exists) continue;
    for (const fn of s.otherFormes ?? []) {
      const f = Dex.species.get(fn);
      if (!f.exists || !/Mega|Primal/.test(f.forme)) continue;
      out[p.slug] = {
        name: f.name,
        baseStats: bs(f.baseStats),
        types: mapTypes(f.types),
        ability: (Object.values(f.abilities)[0] as string) ?? p.abilities[0] ?? "",
        item: f.requiredItem ?? "",
      };
      break; // first Mega/Primal forme (e.g. Charizard-Mega-X)
    }
  }
  return out;
}

export const dynamic = "force-dynamic";

export default async function ChoiceDexPage() {
  const [pokemon, teams] = await Promise.all([listPokemon(), listTeams()]);
  const refs: PokemonRef[] = pokemon.map((p) => ({
    slug: p.slug,
    name: p.name,
    types: p.types,
    baseStats: p.baseStats,
    abilities: p.abilities,
    moves: p.moves,
  }));

  const savedTeams: SavedTeam[] = teams
    .filter((t) => !t.isBox) // boxes are holding lists, not battle teams
    .map((t) => {
      const latest = t.versions[t.versions.length - 1];
      const members = latest?.snapshot.members ?? [];
      const sets: Record<string, KnownSet> = {};
      for (const m of members) {
        sets[m.species] ??= {
          evs: m.spread.evs,
          nature: m.nature,
          item: m.item ?? "None",
          ability: m.ability ?? "",
          moves: m.moves,
        };
      }
      return {
        id: t.id,
        name: t.name,
        members: members.map((m) => m.species),
        sets,
      };
    })
    .filter((t) => t.members.length > 0);

  const itemNames = ["None", ...itemCatalog().map((i) => i.name)];
  const megaForms = buildMegaForms(refs);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">ChoiceDex</h1>
        <ProvisionalTag />
      </div>
      <p className="max-w-2xl text-sm text-slate-400">
        Set up both teams, start the battle, and get the best options each round
        as you enter what happened. All calculations are provisional and
        unverified for Pokémon Champions.
      </p>

      <OnceTutorial
        id="choicedex"
        title="How to use ChoiceDex"
        points={[
          "Doubles is about targeting: focus-fire to remove a threat while keeping both of your Pokémon alive.",
          "Each round, enter what happened — HP, status, field, and switches — and the app re-ranks your best plays.",
          "Predict Protect and double-target reads; positioning, switches, and speed control decide most turns.",
          "Use speed control (Tailwind / Trick Room) and redirection, and play around the opponent's.",
          "Reference: vgcguide.com/battling. Mechanics are provisional — treat recommendations as guidance and sanity-check key calcs.",
        ]}
      />


      {refs.length === 0 ? (
        <Panel>
          <p className="text-sm text-slate-400">
            Import Pokémon first: <code>pnpm db:seed</code>.
          </p>
        </Panel>
      ) : (
        <>
          <ChoiceDexApp pokemon={refs} teams={savedTeams} items={itemNames} megaForms={megaForms} />

          <details className="rounded-lg border border-slate-800 bg-slate-900/40">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-300">
              Advanced tools
            </summary>
            <div className="space-y-6 border-t border-slate-800 p-4">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-400">Opponent stats from a hit</h3>
                <HitInference pokemon={refs} variants={buildVariants(refs)} />
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-400">Opponent Speed inference</h3>
                <OpponentInference pokemon={refs} />
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-400">Simulation mode</h3>
                <Simulator pokemon={refs} />
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-400">Battle analysis</h3>
                <p className="text-sm text-slate-400">
                  Import a finished battle and review each turn — actual vs
                  recommended play, a personal dashboard, and confidence
                  calibration.{" "}
                  <Link href="/battles" className="text-amber-400 hover:underline">Open Battles →</Link>
                </p>
              </section>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
