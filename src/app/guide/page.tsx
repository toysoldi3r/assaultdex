import Link from "next/link";

export const metadata = { title: "Guide - AssaultDex" };

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
          6 Pokémon, then pick 4 at team preview based on the matchup, and lead with
          2.
        </p>
      </Section>

      <Section title="The building blocks">
        <p className="mb-2 text-slate-400">
          Click any term for a fuller explainer in the{" "}
          <Link href="/database/knowledgebase" className="text-amber-400 hover:underline">Knowledgebase</Link>.
        </p>
        <Term term="Base stats" href="/database/knowledgebase/base-stats">
          Each Pokémon has six stats: HP, Attack (Atk), Defense (Def), Special
          Attack (SpA), Special Defense (SpD), and Speed (Spe). Higher isn&apos;t
          always better - a role dictates which stats matter.
        </Term>
        <Term term="EVs (Effort Values)" href="/database/knowledgebase/evs">
          You distribute up to 508 EVs across stats (max 252 per stat) to tune a
          Pokémon. 4 EVs = 1 stat point at level 50 for most stats. This is how two
          copies of the same Pokémon can play completely differently.
        </Term>
        <Term term="IVs (Individual Values)" href="/database/knowledgebase/ivs">
          Fixed per-Pokémon values 0–31 per stat. You usually run 31 everywhere;
          a common exception is a 0 Attack IV on special attackers to minimise
          confusion and Foul Play damage.
        </Term>
        <Term term="Nature" href="/database/knowledgebase/nature">
          Raises one stat by 10% and lowers another by 10%. Adamant (+Atk −SpA) and
          Modest (+SpA −Atk) are common on attackers; Timid/Jolly boost Speed.
        </Term>
        <Term term="STAB (Same-Type Attack Bonus)" href="/database/knowledgebase/stab">
          A move whose type matches the user&apos;s type deals ×1.5 damage. It&apos;s
          why coverage moves off-type need higher base power to compete.
        </Term>
        <Term term="Speed control" href="/database/knowledgebase/speed-control">
          Tools that decide who moves first: Tailwind (doubles your team&apos;s
          Speed), Trick Room (slower Pokémon move first), and speed-lowering moves
          like Icy Wind and Thunder Wave. Controlling turn order is central to
          doubles.
        </Term>
        <Term term="Weather & terrain" href="/database/knowledgebase/weather-terrain">
          Field effects (Sun, Rain, Sand, Snow; Electric/Grassy/Misty/Psychic
          Terrain) that boost or weaken certain moves and enable specific
          strategies.
        </Term>
        <Term term="Team roles" href="/database/knowledgebase/team-roles">
          Common roles include restricted/attacker (offense), support (redirection,
          screens, Fake Out), and speed control. A good team covers each role and
          shares few weaknesses.
        </Term>
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

function Term({
  term,
  href,
  children,
}: {
  term: string;
  /** Knowledgebase page for this term; the name links to it. */
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <p className="mt-2 first:mt-0">
      {href ? (
        <Link href={href} className="font-semibold text-amber-400 hover:underline">{term}</Link>
      ) : (
        <span className="font-semibold text-slate-100">{term}</span>
      )}
      <span className="font-semibold text-slate-100">.</span>{" "}
      <span className="text-slate-400">{children}</span>
    </p>
  );
}
