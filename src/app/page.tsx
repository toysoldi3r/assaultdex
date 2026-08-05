import Link from "next/link";
import { Panel } from "@/components/ui";
import { MetaCards } from "@/components/home/MetaCards";
import { refreshMetagameAction } from "@/app/actions/meta";
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
  const cores2 = getCores(2, 10);
  const cores3 = getCores(3, 10);
  const cores4 = getCores(4, 10);

  return (
    <div className="space-y-6">
      {/* Experimental label */}
      <div>
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
          ⚠ Data &amp; Mechanics may be inaccurate
        </span>
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
        <ul className="grid gap-x-6 gap-y-2 text-sm text-slate-300 sm:grid-cols-2">
          <li><Link className="font-medium text-amber-400 hover:underline" href="/guide">Guide</Link> — new here? Start with the intro to the app and competitive doubles.</li>
          <li><Link className="font-medium text-amber-400 hover:underline" href="/pokemon">Pokédex</Link> — search by name/type/ability/move; per-Pokémon stats, matchups, sets, and common items.</li>
          <li><Link className="font-medium text-amber-400 hover:underline" href="/teams">Teams</Link> — Showdown-style builder with legality, analysis, and versioned saves.</li>
          <li><Link className="font-medium text-amber-400 hover:underline" href="/choicedex">ChoiceDex</Link> — live battle assistant: best play each turn as you enter what happens.</li>
          <li><Link className="font-medium text-amber-400 hover:underline" href="/database">Database</Link> — items, abilities (with their Pokémon), and a damage calculator.</li>
          <li><Link className="font-medium text-amber-400 hover:underline" href="/types">Types</Link> &amp; <Link className="font-medium text-amber-400 hover:underline" href="/sources">Sources</Link> — the type chart and the major community sites.</li>
        </ul>
      </Panel>

      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Metagame — {CHAMPIONS_FORMAT_LABEL}</h2>
          <form action={refreshMetagameAction}>
            <button className="rounded border border-slate-600 px-3 py-1 text-xs hover:border-amber-500">
              ↻ Refresh metagame data
            </button>
          </form>
        </div>
        <p className="mb-2 text-xs text-slate-500">
          Usage is battle-weighted from the MunchStats Champions ladder (share of
          recorded battles a Pokémon appears in). Other sites may weight
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
        <div className="flex flex-wrap items-start gap-4">
          <LlmUsageLabel />
          <div className="max-w-2xl space-y-2 text-sm text-slate-400">
            <p>
              Mechanics status is <strong>{MECHANICS_STATUS}</strong>. Pokémon
              Champions mechanics are not publicly documented, so every formula
              (type chart, speed, damage) is a mainline-derived placeholder flagged
              as unverified. Usage statistics come from a committed snapshot of the
              MunchStats ladder and are not fabricated.
            </p>
            <p>
              <strong className="text-slate-200">Built with generative AI.</strong>{" "}
              This project was written largely with an AI coding assistant. AI can
              be wrong — verify anything important against the primary{" "}
              <Link href="/sources" className="text-amber-400 hover:underline">sources</Link>{" "}
              before relying on it, keep a human in the loop for decisions, and
              don&apos;t treat generated numbers as ground truth.
            </p>
            <p className="text-xs">
              Learn more about responsible AI use:{" "}
              <a href="https://mmmlabel.tech/" target="_blank" rel="noreferrer noopener" className="text-amber-400 hover:underline">mmmlabel.tech</a>,{" "}
              <a href="https://www.unesco.org/en/artificial-intelligence/recommendation-ethics" target="_blank" rel="noreferrer noopener" className="text-amber-400 hover:underline">UNESCO AI ethics</a>,{" "}
              <a href="https://www.nist.gov/itl/ai-risk-management-framework" target="_blank" rel="noreferrer noopener" className="text-amber-400 hover:underline">NIST AI RMF</a>.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/** Self-contained "content made with AI" label (mmmlabel.tech style). */
function LlmUsageLabel() {
  return (
    <a
      href="https://mmmlabel.tech/"
      target="_blank"
      rel="noreferrer noopener"
      title="This content was made with generative AI — mmmlabel.tech transparency label"
      className="shrink-0"
    >
      <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label="Made with GenAI">
        <circle cx="60" cy="60" r="58" fill="#0f172a" stroke="#38bdf8" strokeWidth="3" />
        <text x="60" y="30" textAnchor="middle" fontSize="11" fill="#7dd3fc" fontFamily="sans-serif">MADE WITH</text>
        {/* simple robot glyph */}
        <rect x="40" y="42" width="40" height="34" rx="6" fill="none" stroke="#e2e8f0" strokeWidth="3" />
        <circle cx="51" cy="59" r="4" fill="#38bdf8" />
        <circle cx="69" cy="59" r="4" fill="#38bdf8" />
        <line x1="60" y1="34" x2="60" y2="42" stroke="#e2e8f0" strokeWidth="3" />
        <circle cx="60" cy="32" r="3" fill="#38bdf8" />
        <line x1="47" y1="68" x2="73" y2="68" stroke="#e2e8f0" strokeWidth="3" />
        <text x="60" y="98" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#e2e8f0" fontFamily="sans-serif">GenAI</text>
      </svg>
    </a>
  );
}
