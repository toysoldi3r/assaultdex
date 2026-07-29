import { Panel } from "@/components/ui";

export const metadata = { title: "Terms — AssaultDex" };

export default function TermsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Terms</h1>
      <Panel>
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            AssaultDex is provided for informational and analytical purposes for
            competitive Pokémon Champions doubles.
          </p>
          <h2 className="font-semibold text-slate-100">Provisional mechanics</h2>
          <p className="text-slate-400">
            Pokémon Champions mechanics are not publicly documented. All damage,
            speed, type, and probability calculations in this build are
            <strong> provisional</strong> placeholders derived from documented
            mainline formulas and are explicitly unverified for Champions. No
            output should be treated as a guaranteed result.
          </p>
          <h2 className="font-semibold text-slate-100">No warranty</h2>
          <p className="text-slate-400">
            The software is provided “as is”, without warranty of any kind.
            Recommendations are estimates and may be inaccurate.
          </p>
          <h2 className="font-semibold text-slate-100">Intellectual property</h2>
          <p className="text-slate-400">
            Pokémon and related names are trademarks of their respective owners.
            AssaultDex is an independent tool and is not affiliated with or
            endorsed by those owners.
          </p>
          <p className="text-xs text-slate-500">
            This is a development build; these terms are provisional and not
            legal advice.
          </p>
        </div>
      </Panel>
    </div>
  );
}
