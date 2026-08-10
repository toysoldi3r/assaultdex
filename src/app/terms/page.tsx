import { Panel } from "@/components/ui";

export const metadata = { title: "Terms - AssaultDex" };

export default function TermsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Terms &amp; disclaimer</h1>
      <Panel>
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            AssaultDex is a free, non-commercial fan project that provides
            informational and analytical tools for competitive Pokémon Champions
            doubles. By using it you accept the terms below.
          </p>

          <div>
            <h2 className="font-semibold text-slate-100">Not official, not affiliated</h2>
            <p className="mt-1 text-slate-400">
              AssaultDex is an independent, unofficial project. It is not made,
              published, sponsored, endorsed by, or affiliated with Nintendo,
              Game Freak, Creatures Inc., or The Pokémon Company. &ldquo;Pokémon&rdquo; and all
              related names, characters, sprites, and imagery are trademarks and
              copyrights of their respective owners.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-100">We claim no ownership</h2>
            <p className="mt-1 text-slate-400">
              We do not own any Pokémon intellectual property, and we make no
              ownership claim over it. All Pokémon names, species data, move,
              ability, and item information shown here are factual game data
              belonging to their rights holders, presented for reference and
              commentary. Species, move, ability, and item reference data is
              sourced from the open-source{" "}
              <a href="https://github.com/pkmn/ps" target="_blank" rel="noreferrer noopener" className="text-amber-400 hover:underline">
                pkmn / Pokémon Showdown
              </a>{" "}
              dataset (MIT-licensed). Metagame statistics are aggregated from
              publicly available ladder results. AssaultDex claims no rights over
              any of this underlying data; only its own original code, layout,
              and written explanations are its own work.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-100">Fair use &amp; takedowns</h2>
            <p className="mt-1 text-slate-400">
              Trademarked names and game facts are used nominatively, in a
              non-commercial context, to identify and discuss the game - not to
              imply any association. If you are a rights holder and believe
              something here should be changed or removed, contact us and we will
              act promptly.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-100">Provisional mechanics</h2>
            <p className="mt-1 text-slate-400">
              Pokémon Champions battle mechanics are not publicly documented.
              Every damage, speed, type, and probability calculation here is a{" "}
              <strong>provisional</strong> placeholder derived from mainline
              formulas and is explicitly unverified for Champions. Treat all
              output as guidance, never as a guaranteed result.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-100">No warranty</h2>
            <p className="mt-1 text-slate-400">
              The service is provided &ldquo;as is&rdquo;, without warranty of any kind, and
              is used at your own risk. We are not liable for any loss arising
              from its use.
            </p>
          </div>

          <p className="text-xs text-slate-500">
            This notice is provided in good faith and is not legal advice.
          </p>
        </div>
      </Panel>
    </div>
  );
}
