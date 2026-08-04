import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/ui";
import { TeamBuilder, type MemberRef } from "@/components/teams/TeamBuilder";
import { NATURES } from "@/data/fixtures/natures";
import { itemCatalog, poolDescMaps } from "@/data/catalog";
import { getMonTournament } from "@/data/tournamentStats";
import { usageKey } from "@/data/usageStats";
import { listPokemon } from "@/server/repositories/pokemonRepo";
import { getTeam } from "@/server/repositories/teamRepo";
import { resolveTeam } from "@/server/teamResolve";
import { TeamMenu, type MenuVersion } from "@/components/teams/TeamMenu";
import { LegalityDot } from "@/components/teams/LegalityDot";
import { TeamAnalysisPanel } from "@/components/teams/TeamAnalysisPanel";

export const dynamic = "force-dynamic";

const NATURE_NAMES = Object.keys(NATURES);

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) notFound();

  const latest = team.versions[team.versions.length - 1]!;
  // Legality/analysis only apply to real teams; a box is an unbounded holding
  // list, so running the 6-member team rules over it is meaningless.
  const resolved = team.isBox ? null : await resolveTeam(latest.snapshot);

  // Teambuilder needs a reference (name, abilities, legal moves, base stats) for
  // every pool species so newly added members render too.
  const allMons = await listPokemon();
  const memberRefs: Record<string, MemberRef> = {};
  const moveMeta: Record<string, { type: (typeof allMons)[number]["types"][number]; category: "physical" | "special" | "status"; power: number | null }> = {};
  for (const p of allMons) {
    memberRefs[p.slug] = {
      name: p.name,
      types: p.types,
      abilities: p.abilities,
      legalMoves: p.moves.map((mv) => mv.name),
      baseStats: p.baseStats,
    };
    for (const mv of p.moves) {
      moveMeta[mv.name] ??= { type: mv.type, category: mv.category, power: mv.power };
    }
  }
  const pool = allMons.map((p) => ({ slug: p.slug, name: p.name }));

  // Description maps for the picker panels (memoised — the pool is static).
  const { abilityDesc, moveDesc } = poolDescMaps(allMons);
  const items = itemCatalog();

  // Tournament "Popular" lists per pool species (empty until the CI snapshot
  // is populated). Keyed by @pkmn id to match the teambuilder lookup.
  const tournament: Record<
    string,
    { items: { name: string; pct: number }[]; abilities: { name: string; pct: number }[]; moves: { name: string; pct: number }[] }
  > = {};
  for (const p of allMons) {
    const t = getMonTournament(p.name);
    if (t) tournament[usageKey(p.name)] = { items: t.items, abilities: t.abilities, moves: t.moves };
  }

  const menuVersions: MenuVersion[] = team.versions.map((v) => ({
    versionNumber: v.versionNumber,
    label: v.label,
    members: v.snapshot.members.length,
    createdAt: v.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <Link href="/teams" className="text-sm text-amber-400 hover:underline">
        ← Teams
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          {resolved && (
            <LegalityDot
              legal={resolved.validation.valid}
              errors={[
                ...resolved.missingSpecies.map((s) => `Missing from Pokédex: ${s}`),
                ...resolved.validation.errors.map(
                  (e) => `${e.species ? `${e.species}: ` : ""}${e.message}`,
                ),
                ...resolved.validation.warnings.map(
                  (w) => `${w.species ? `${w.species}: ` : ""}${w.message}`,
                ),
              ]}
            />
          )}
          {team.name}
        </h1>
        <TeamMenu
          teamId={team.id}
          notes={team.notes}
          versions={menuVersions}
          latest={latest.versionNumber}
        />
      </div>

      {/* Collapsible team analysis (teams only, not boxes) */}
      {resolved?.analysis && <TeamAnalysisPanel analysis={resolved.analysis} />}

      <Panel title="Teambuilder">
        <TeamBuilder
          teamId={team.id}
          isBox={team.isBox}
          initialMembers={latest.snapshot.members}
          refs={memberRefs}
          pool={pool}
          natures={NATURE_NAMES}
          items={items}
          abilityDesc={abilityDesc}
          moveDesc={moveDesc}
          moveMeta={moveMeta}
          tournament={tournament}
        />
      </Panel>
    </div>
  );
}
