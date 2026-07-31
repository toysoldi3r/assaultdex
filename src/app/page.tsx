import Link from "next/link";
import { Panel } from "@/components/ui";
import { MECHANICS_STATUS } from "@/domain/mechanics/assumptions";

export default function HomePage() {
  return (
    <div className="space-y-6">
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

      <Panel title="Honesty notes">
        <p className="text-sm text-slate-400">
          Mechanics status is <strong>{MECHANICS_STATUS}</strong>. Pokémon
          Champions mechanics are not publicly documented, so every formula
          (type chart, speed, damage) is a mainline-derived placeholder flagged
          as unverified. Statistics, usage data, and later modules are not part
          of this slice and are not fabricated.
        </p>
      </Panel>
    </div>
  );
}
