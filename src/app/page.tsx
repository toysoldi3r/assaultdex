import Link from "next/link";
import { Panel } from "@/components/ui";
import { MetaCards } from "@/components/home/MetaCards";
import { MECHANICS_STATUS } from "@/domain/mechanics/assumptions";
import {
  CHAMPIONS_FORMAT_LABEL,
  getCores,
  getTopTeams,
  topMeta,
  topWinRate,
} from "@/data/usageStats";

export default function HomePage() {
  const meta = topMeta(20);
  const winrate = topWinRate(20, 3);
  const teams = getTopTeams(10);
  const cores2 = getCores(2, 8);
  const cores3 = getCores(3, 8);
  const cores4 = getCores(4, 8);

  return (
    <div className="space-y-6">
      {/* Experimental + GenAI content labels */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
          ⚠ Experimental — data and mechanics may be inaccurate
        </span>
        <a
          href="https://mmmlabel.tech/"
          target="_blank"
          rel="noreferrer noopener"
          title="Made together with generative AI — mmmlabel.tech content transparency label"
          className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-500/20"
        >
          <span aria-hidden>🤖</span> Made with GenAI
          <span className="text-sky-500/70">· mmm</span>
        </a>
      </div>

      <div>
        <h1 className="text-3xl font-bold">AssaultDex</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Decision support for competitive{" "}
          <strong>Pokémon Champions doubles</strong>: browse the Pokédex, build
          and version teams, and run the ChoiceDex battle calculator on a live
          battle state.
        </p>
      </div>

      <Panel title="What's here">
        <ul className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
          <li>
            <Link className="text-amber-400 hover:underline" href="/pokemon">
              Pokédex
            </Link>{" "}
            — live search by name, type, ability, or move, sortable by any base
            stat, with per-Pokémon pages (stats, matchups, moves).
          </li>
          <li>
            <Link className="text-amber-400 hover:underline" href="/teams">
              Teams
            </Link>{" "}
            — build teams, save immutable versions, and import/export in Pokémon
            Showdown format.
          </li>
          <li>
            <Link className="text-amber-400 hover:underline" href="/choicedex">
              ChoiceDex
            </Link>{" "}
            — set up both teams, start a battle, and get the best options each
            round as you enter what happened.
          </li>
          <li>Every data value flows through a validated provider adapter.</li>
        </ul>
      </Panel>

      <div>
        <h2 className="mb-1 text-lg font-semibold">Metagame — {CHAMPIONS_FORMAT_LABEL}</h2>
        <p className="mb-2 text-xs text-slate-500">
          Usage is battle-weighted from the MunchStats Champions ladder ({" "}
          share of recorded battles a Pokémon appears in). Other sites may weight
          differently, so exact percentages vary by source.
        </p>
        <MetaCards
          meta={meta}
          winrate={winrate}
          teams={teams}
          cores2={cores2}
          cores3={cores3}
          cores4={cores4}
        />
      </div>

      <Panel title="Honesty notes">
        <p className="text-sm text-slate-400">
          Mechanics status is <strong>{MECHANICS_STATUS}</strong>. Pokémon
          Champions mechanics are not publicly documented, so every formula
          (type chart, speed, damage) is a mainline-derived placeholder flagged
          as unverified. Usage statistics come from a committed snapshot of the
          MunchStats ladder and are not fabricated.
        </p>
      </Panel>
    </div>
  );
}
