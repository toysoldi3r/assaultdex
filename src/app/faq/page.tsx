import Link from "next/link";
import { Panel } from "@/components/ui";

export const metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about AssaultDex: what Pokémon Champions is, how legality and mechanics work, and why numbers are provisional.",
};

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What is AssaultDex?",
    a: (
      <>
        A fan-made toolkit for competitive Pokémon Champions doubles: a{" "}
        <Link href="/pokemon" className="text-amber-400 hover:underline">Pokédex</Link>, a{" "}
        <Link href="/teams" className="text-amber-400 hover:underline">team builder</Link>, live battle
        recommendations in{" "}
        <Link href="/choicedex" className="text-amber-400 hover:underline">ChoiceDex</Link>, and a{" "}
        <Link href="/database" className="text-amber-400 hover:underline">reference database</Link>.
      </>
    ),
  },
  {
    q: "What is Pokémon Champions?",
    a: "An upcoming competitive Pokémon title focused on battling. Its exact mechanics are not publicly documented, so AssaultDex uses mainline-derived placeholders and flags them as provisional throughout.",
  },
  {
    q: "Are the damage and speed numbers accurate?",
    a: (
      <>
        Treat them as guidance, not gospel. Champions&apos; formulas are unverified, so calculations use
        mainline-derived placeholders. See the{" "}
        <Link href="/help" className="text-amber-400 hover:underline">Help page</Link> for details.
      </>
    ),
  },
  {
    q: "Where does the usage data come from?",
    a: "A committed ladder snapshot bundled with the app. It is not fabricated and not fetched live, so it only changes when the snapshot is refreshed.",
  },
  {
    q: "How many Pokémon, moves, and items are legal?",
    a: (
      <>
        The Champions roster is 235 Pokémon (formes included). The home page shows the live legal counts for
        moves and items; the{" "}
        <Link href="/database" className="text-amber-400 hover:underline">Database</Link> tab lets you toggle
        between the Champions-legal set and the full list.
      </>
    ),
  },
  {
    q: "Does a team need a held item and four moves to be legal?",
    a: "No. In this format a held item is optional and three moves are legal. The team builder shows those as advisory flags, never as errors.",
  },
  {
    q: "Is my team data saved anywhere?",
    a: (
      <>
        Teams live in your local database; edits autosave. Nothing is uploaded to a third party. See{" "}
        <Link href="/privacy" className="text-amber-400 hover:underline">Privacy</Link>.
      </>
    ),
  },
  {
    q: "Is this official?",
    a: "No. AssaultDex is fan-made and unofficial. Pokémon and all related names are trademarks of Nintendo, Game Freak, and The Pokémon Company.",
  },
];

export default function FaqPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Frequently asked questions</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Quick answers about the app and the format. Still stuck? The{" "}
          <Link href="/help" className="text-amber-400 hover:underline">Help page</Link> covers
          troubleshooting.
        </p>
      </div>

      {FAQS.map((f) => (
        <Panel key={f.q} title={f.q}>
          <p className="text-sm text-slate-300">{f.a}</p>
        </Panel>
      ))}

      <Link href="/" className="inline-block text-sm text-amber-400 hover:underline">
        &larr; Back to AssaultDex
      </Link>
    </div>
  );
}
