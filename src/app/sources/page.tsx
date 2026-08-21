import { SourceIcon } from "@/components/SourceIcon";

export const metadata = {
  title: "Sources",
  description: "Major Pokémon community sites, tools, and references AssaultDex draws on.",
};

interface Source {
  name: string;
  url: string;
  what: string;
}

/** Stable icon slug from a site URL (domain's first label): the key
 *  scripts/refreshSourceIcons.ts writes public/sourceicons/<slug>.png under. */
function slugOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".")[0]!.replace(/[^a-z0-9]/gi, "").toLowerCase();
  } catch {
    return "site";
  }
}

const SOURCES: { group: string; items: Source[] }[] = [
  {
    group: "Play & test",
    items: [
      {
        name: "Pokémon Showdown",
        url: "https://play.pokemonshowdown.com/",
        what: "Free online battle simulator and team builder. The de-facto place to test teams, with import/export in the standard set format this app also uses.",
      },
    ],
  },
  {
    group: "Pokémon Champions",
    items: [
      {
        name: "Pokébase - Champions teams",
        url: "https://pokebase.app/pokemon-champions/teams",
        what: "Community-shared Pokémon Champions teams you can browse for inspiration and import.",
      },
      {
        name: "Pokémon Zone - Champions",
        url: "https://www.pokemon-zone.com/champions/",
        what: "A Pokémon Champions hub with team lists, tier data, and format-specific tools.",
      },
    ],
  },
  {
    group: "Usage & tournament stats",
    items: [
      {
        name: "Pikalytics",
        url: "https://www.pikalytics.com/",
        what: "VGC/BSS usage statistics: most-used Pokémon, common moves, items, spreads, and teammates for the current format.",
      },
      {
        name: "Limitless VGC",
        url: "https://limitlessvgc.com/",
        what: "Official-style VGC tournament results, event coverage, and team lists from top players and regional/international events.",
      },
      {
        name: "Meta VGC",
        url: "https://metavgc.com/",
        what: "Metagame usage and team statistics for VGC formats, with trends, common sets, and archetypes.",
      },
      {
        name: "ShowdownTier",
        url: "https://showdowntier.com/",
        what: "Usage and tier data derived from the Pokémon Showdown ladder across formats.",
      },
      {
        name: "MunchStats",
        url: "https://munchstats.com/",
        what: "Ladder-derived usage and team-ranking data. AssaultDex's own metagame snapshot is aggregated from this source.",
      },
      {
        name: "Labmaus",
        url: "https://labmaus.net/",
        what: "VGC usage and win-rate analytics with detailed move/item/spread breakdowns and tournament data across formats.",
      },
    ],
  },
  {
    group: "Guides & learning",
    items: [
      {
        name: "VGC Guide",
        url: "https://www.vgcguide.com/",
        what: "Beginner-to-advanced guides on team building, battling, and the metagame - the kind of write-ups behind this app's Teams and ChoiceDex tips.",
      },
    ],
  },
  {
    group: "Reference & mechanics",
    items: [
      {
        name: "Smogon University",
        url: "https://www.smogon.com/",
        what: "Competitive analyses, sample sets, strategy articles, and the Smogon forums - the largest competitive community and rules authority for singles and doubles.",
      },
      {
        name: "PokémonDB",
        url: "https://pokemondb.net/",
        what: "Clean Pokédex reference: base stats, movepools, abilities, type charts, and evolution data.",
      },
      {
        name: "Serebii",
        url: "https://www.serebii.net/",
        what: "Long-running Pokémon news and reference database: Pokédex, movesets, event and game-mechanic details across every generation.",
      },
      {
        name: "Bulbapedia",
        url: "https://bulbapedia.bulbagarden.net/",
        what: "Encyclopedic coverage of mechanics, move/ability interactions, game history, and edge cases - good for 'how does X actually work'.",
      },
    ],
  },
  {
    group: "Communities & forums",
    items: [
      {
        name: "r/VGC",
        url: "https://www.reddit.com/r/VGC/",
        what: "Reddit community for the official doubles format: team help, tournament talk, and metagame discussion.",
      },
      {
        name: "r/stunfisk",
        url: "https://www.reddit.com/r/stunfisk/",
        what: "Reddit's competitive-Pokémon hub (singles-leaning) for theory, set discussion, and news.",
      },
      {
        name: "r/pokemon",
        url: "https://www.reddit.com/r/pokemon/",
        what: "General Pokémon community - news and casual discussion, less competitive focus.",
      },
    ],
  },
];

export default function SourcesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sources</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Major Pokémon sites and communities for usage stats, tournament data,
          mechanics reference, and team help. Links open in a new tab.
        </p>
      </div>

      {SOURCES.map((g) => (
        <section key={g.group}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            {g.group}
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {g.items.map((s) => (
              <li key={s.name}>
                {/* Whole card is the link, not just the name. */}
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex h-full gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3 transition-colors hover:border-amber-500/60 hover:bg-slate-900/70"
                >
                  <SourceIcon slug={slugOf(s.url)} name={s.name} />
                  <div className="min-w-0">
                    <span className="font-semibold text-amber-400">{s.name} ↗</span>
                    <p className="mt-1 text-sm text-slate-300">{s.what}</p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
