import Link from "next/link";
import { Panel } from "@/components/ui";

export const metadata = {
  title: "Help & troubleshooting - AssaultDex",
};

const REPO_ISSUES = "https://github.com/toystores/assaultdex/issues";

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Help &amp; troubleshooting</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Something not working, or unsure what a tab does? Start here. If none
          of the cases below fix it, report the problem with the details at the
          bottom.
        </p>
      </div>

      <Panel title="What each tab does">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          <li><Link href="/guide" className="text-amber-400 hover:underline">Guide</Link>: an intro to the app and to competitive doubles.</li>
          <li><Link href="/pokemon" className="text-amber-400 hover:underline">Pokédex</Link>, <Link href="/teams" className="text-amber-400 hover:underline">Teams</Link>, <Link href="/choicedex" className="text-amber-400 hover:underline">ChoiceDex</Link>: browse Pokémon, build teams, and get live battle recommendations.</li>
          <li><Link href="/database" className="text-amber-400 hover:underline">Database</Link> and <Link href="/sources" className="text-amber-400 hover:underline">Sources</Link>: item / ability / move reference, the type chart, a damage calculator, and links to major community sites.</li>
        </ul>
      </Panel>

      <Panel title="A page is blank or shows “Something went wrong”">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          <li>Refresh the page, or use the &ldquo;Try again&rdquo; button on the error screen.</li>
          <li>Your team or battle data is safe; a single page failing to load does not delete anything.</li>
          <li>
            Running it yourself? The first request after starting the dev server
            compiles on demand and can take a few seconds. If a page stays empty,
            make sure the database is set up (see the next card).
          </li>
        </ul>
      </Panel>

      <Panel title="Empty Pokédex or Teams (local setup only)">
        <p className="text-sm text-slate-300">
          If you are running AssaultDex locally and the Pokémon pool is empty,
          the database has not been created and seeded yet. From the project
          folder run <code>pnpm exec prisma migrate deploy</code> then{" "}
          <code>pnpm db:seed</code>, and refresh.
        </p>
      </Panel>

      <Panel title="ChoiceDex opens an old battle or a team that no longer exists">
        <p className="text-sm text-slate-300">
          ChoiceDex remembers your last battle so you can switch tabs and come
          back. It discards a saved battle whose Pokémon no longer match a real
          team, but if you still see a stale one, click <strong>New battle</strong>,
          or clear this site&apos;s data in your browser (Application &rsaquo; Local
          Storage).
        </p>
      </Panel>

      <Panel title="A calculation looks wrong">
        <p className="text-sm text-slate-300">
          All battle mechanics are <strong>provisional</strong>. Pokémon
          Champions&apos; formulas are not publicly documented, so damage, speed,
          abilities, items, and residual effects use mainline-derived placeholders
          and are flagged as unverified throughout the app. Differences from the
          real game are expected until the mechanics are confirmed - treat the
          numbers as guidance, not gospel.
        </p>
      </Panel>

      <Panel title="Built with generative AI">
        <p className="text-sm text-slate-300">
          This project was written largely with an AI coding assistant, and
          Champions mechanics are unverified placeholders. Verify anything
          important against the primary{" "}
          <Link href="/sources" className="text-amber-400 hover:underline">sources</Link>{" "}
          before relying on it. Usage statistics come from a committed ladder
          snapshot and are not fabricated.
        </p>
      </Panel>

      <Panel title="Report a problem">
        <p className="text-sm text-slate-300">Open an issue and include:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-400">
          <li>What you did, and what you expected versus what happened</li>
          <li>The page (for example <code>/choicedex</code>) and your browser</li>
          <li>A screenshot if the layout looks wrong</li>
        </ul>
        <a
          href={REPO_ISSUES}
          className="mt-3 inline-block rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
        >
          Report an issue on GitHub
        </a>
      </Panel>

      <Link href="/" className="inline-block text-sm text-amber-400 hover:underline">
        &larr; Back to AssaultDex
      </Link>
    </div>
  );
}
