import Link from "next/link";
import { Manrope } from "next/font/google";
import { ChoiceDexApp, type KnownSet, type SavedTeam } from "@/components/choicedex/ChoiceDexApp";
import { HitInference } from "@/components/choicedex/HitInference";
import { OpponentInference } from "@/components/choicedex/OpponentInference";
import { Simulator } from "@/components/choicedex/Simulator";
import { toPokemonRefs, type PokemonRef } from "@/lib/choicedexBuild";
import { buildVariants, buildMegaForms } from "@/data/battleFormes";
import { listPokemon } from "@/server/repositories/pokemonRepo";
import { listTeams } from "@/server/repositories/teamRepo";
import { listDbItems } from "@/data/dexDatabase";
import { topMeta } from "@/data/usageStats";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ChoiceDex",
  description: "Live battle recommendations for Pokémon Champions doubles - enter what happens and get the best options each round.",
};

// Manrope is the redesign's UI typeface; Space Mono (loaded app-wide) stays the
// numeral font. Scoped to the ChoiceDex screens via this variable + class.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export default async function ChoiceDexPage() {
  const [pokemon, teams] = await Promise.all([listPokemon(), listTeams()]);
  const refs: PokemonRef[] = toPokemonRefs(pokemon);

  const savedTeams: SavedTeam[] = teams
    .filter((t) => !t.isBox)
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
      return { id: t.id, name: t.name, members: members.map((m) => m.species), sets };
    })
    .filter((t) => t.members.length > 0);

  const itemNames = ["None", ...listDbItems().filter((i) => i.competitive).map((i) => i.name)];
  const megaForms = buildMegaForms(refs);

  // Ladder-usage percentage per species, for the slot picker's usage column.
  const usage: Record<string, number> = {};
  const slugByName = new Map(refs.map((r) => [r.name, r.slug] as const));
  for (const m of topMeta(1000)) {
    const slug = slugByName.get(m.name);
    if (slug) usage[slug] = Math.round(m.usage * 10) / 10;
  }

  const advancedTools =
    refs.length === 0 ? null : (
      <details style={{ borderRadius: 14, border: "1px solid oklch(30% 0.01 240)", background: "oklch(20% 0.008 240)" }}>
        <summary style={{ cursor: "pointer", padding: "13px 16px", fontSize: 13, fontWeight: 800, color: "oklch(72% 0.01 240)" }}>Advanced tools</summary>
        <div style={{ borderTop: "1px solid oklch(30% 0.01 240)", padding: 16, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 14 }}>
          <section style={{ borderRadius: 11, border: "1px solid oklch(28% 0.01 240)", padding: 12 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, margin: "0 0 6px" }}>Opponent stats from a hit</h4>
            <HitInference pokemon={refs} variants={buildVariants(refs)} />
          </section>
          <section style={{ borderRadius: 11, border: "1px solid oklch(28% 0.01 240)", padding: 12 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, margin: "0 0 6px" }}>Opponent Speed inference</h4>
            <OpponentInference pokemon={refs} />
          </section>
          <section style={{ borderRadius: 11, border: "1px solid oklch(28% 0.01 240)", padding: 12 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, margin: "0 0 8px" }}>Simulation mode</h4>
            <Simulator pokemon={refs} />
          </section>
          <section style={{ borderRadius: 11, border: "1px solid oklch(28% 0.01 240)", padding: 12 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, margin: "0 0 6px" }}>Battle analysis</h4>
            <p style={{ margin: 0, fontSize: 11, color: "oklch(58% 0.012 240)", lineHeight: 1.5 }}>
              Review a finished battle turn by turn — actual vs recommended play.{" "}
              <Link href="/battles" style={{ color: "oklch(78% 0.1 190)" }}>Open Battles →</Link>
            </p>
          </section>
        </div>
      </details>
    );

  return (
    <div className={manrope.variable} style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}>
      {refs.length === 0 ? (
        <p className="text-sm text-slate-400">
          Import Pokémon first: <code>pnpm db:seed</code>.
        </p>
      ) : (
        <ChoiceDexApp
          pokemon={refs}
          teams={savedTeams}
          items={itemNames}
          megaForms={megaForms}
          usage={usage}
          advancedTools={advancedTools}
        />
      )}
    </div>
  );
}
