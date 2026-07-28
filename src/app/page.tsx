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
          <strong>Pokémon Champions doubles</strong>. This is the Phase 1
          vertical slice: import Pokémon fixtures, browse the Pokédex, build and
          version teams, and run ChoiceDex on a basic battle state.
        </p>
      </div>

      <Panel title="What works in this slice">
        <ul className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
          <li>
            <Link className="text-amber-400 hover:underline" href="/pokemon">
              Pokédex
            </Link>{" "}
            — search and open Pokémon pages with types, base stats, and
            provisional matchups.
          </li>
          <li>
            <Link className="text-amber-400 hover:underline" href="/teams">
              Teams
            </Link>{" "}
            — create teams, save immutable versions, compare versions, and file
            them in collections.
          </li>
          <li>
            <Link className="text-amber-400 hover:underline" href="/choicedex">
              ChoiceDex
            </Link>{" "}
            — pick two user and two opponent Pokémon, enter a basic battle
            state, and get ranked recommendations.
          </li>
          <li>All external data flows through a validated provider adapter.</li>
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
