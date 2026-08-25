import Link from "next/link";

export const metadata = {
  title: "Guide",
  description: "An intro to AssaultDex and to competitive Pokémon Champions doubles.",
};

export default function GuidePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Guide</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          New to competitive Pokémon or to this app? Start here. This page
          explains what AssaultDex does and covers the core ideas of competitive
          doubles (VGC / Pokémon Champions).
        </p>
      </div>

      <Section title="What is AssaultDex?">
        <p>
          AssaultDex is a decision-support tool for the <strong>Pokémon
          Champions</strong> doubles format. It brings together the kinds of
          features usually spread across several different competitive Pokémon
          websites - a Pokédex, a team builder, a live battle calculator
          (ChoiceDex), a reference Database, and metagame statistics - into one
          place. The sites those features draw on are listed on the{" "}
          <Link href="/sources" className="text-amber-400 hover:underline">Sources</Link>{" "}
          tab.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><Link href="/pokemon" className="text-amber-400 hover:underline">Pokédex</Link> - stats, matchups, movepools, common sets and items per Pokémon.</li>
          <li><Link href="/teams" className="text-amber-400 hover:underline">Teams</Link> - build and save teams; get legality and analysis (weaknesses, speed, coverage).</li>
          <li><Link href="/choicedex" className="text-amber-400 hover:underline">ChoiceDex</Link> - set up both teams and get the best play each turn as you enter what happens.</li>
          <li><Link href="/database" className="text-amber-400 hover:underline">Database</Link> - items, abilities, and a two-Pokémon damage calculator.</li>
          <li><Link href="/types" className="text-amber-400 hover:underline">Types</Link> - full type chart and a move-vs-dual-type effectiveness grid.</li>
        </ul>
      </Section>

      <Section title="What is competitive doubles?">
        <p>
          In doubles (VGC / Champions), each side sends out <strong>two Pokémon at
          once</strong> from a team of four chosen before the game. Because both of
          your Pokémon act every turn, the format rewards positioning, target
          selection, and speed control far more than 1-versus-1 singles.
        </p>
        <p className="mt-2">
          A game is short - often 4–8 turns - so every decision matters. You bring
          6 Pokémon, then pick 4 at <strong>team preview</strong> based on the
          matchup, and lead with 2. Picking the right 4 and the right lead is often
          half the game: you can leave a Pokémon in the back specifically to answer
          something you saw in preview.
        </p>
        <h3 className="mt-4 text-sm font-semibold text-slate-100">What makes doubles different</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Two actions a turn.</strong> With two Pokémon out you choose two
            moves (and two targets) every turn, so plays combine: one Pokémon sets
            up or supports while the other attacks.
          </li>
          <li>
            <strong>Targeting &amp; spread moves.</strong> Many moves can hit both
            opponents (Earthquake, Rock Slide, Dazzling Gleam). Spread moves deal
            ×0.75 damage when they hit more than one target - a deliberate trade of
            power for pressure.
          </li>
          <li>
            <strong>Protect is everywhere.</strong> Most teams run Protect on
            multiple Pokémon to stall a turn, dodge a double-up, or wait out a
            threat. Reading Protect is a core mind-game.
          </li>
          <li>
            <strong>Support tools.</strong> Redirection (Follow Me / Rage Powder),
            Fake Out flinches, Intimidate, screens, and Helping Hand let one Pokémon
            multiply what its partner does. Doubles is a team of two, not two solo
            Pokémon.
          </li>
          <li>
            <strong>Speed control decides turn order.</strong> Tailwind, Trick Room,
            Icy Wind, and Thunder Wave swing who moves first - and moving first in a
            fast, high-damage format frequently wins the game.
          </li>
        </ul>
        <p className="mt-3">
          Champions is played best-of-three (Bo3), so adapting your picks and leads
          between games matters as much as any single turn. For the mechanics and
          jargon behind all of this, see the{" "}
          <Link href="/database?tab=terms" className="text-amber-400 hover:underline">Knowledgebase</Link>{" "}
          tab in the Database.
        </p>
      </Section>

      <Section title="Where to learn more">
        <p>
          See the <Link href="/sources" className="text-amber-400 hover:underline">Sources</Link>{" "}
          page for the major sites - Pokémon Showdown to test, Pikalytics and
          Limitless VGC for stats, and Smogon/Bulbapedia for mechanics.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <div className="max-w-3xl text-sm text-slate-300">{children}</div>
    </section>
  );
}

