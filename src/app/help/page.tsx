import Link from "next/link";
import { Panel } from "@/components/ui";

export const metadata = {
  title: "Help & troubleshooting — AssaultDex",
};

const REPO_ISSUES = "https://github.com/toystores/assaultdex/issues";

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Help &amp; troubleshooting</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Something not working? Most issues fall into one of the cases below. If
          none of them fix it, report the problem and include the details listed
          at the bottom.
        </p>
      </div>

      <Panel title="The page is blank or shows “Something went wrong”">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          <li>
            The first page load after starting compiles on demand and can take
            ~15 seconds. Give it a moment, then refresh.
          </li>
          <li>
            If it persists, the database may not be set up. Stop the app and run{" "}
            <code>pnpm db:migrate</code> then <code>pnpm db:seed</code> (or just
            re-run <code>run.bat</code> / <code>run.sh</code>).
          </li>
        </ul>
      </Panel>

      <Panel title="No Pokémon / empty Pokédex or Teams">
        <p className="text-sm text-slate-300">
          The database has not been seeded. Run <code>pnpm db:seed</code> to load
          the 213-Pokémon pool, then refresh.
        </p>
      </Panel>

      <Panel title="The launcher (run.bat / run.sh) fails">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          <li>
            <strong>Windows:</strong> run it inside a terminal or double-click{" "}
            <code>run.bat</code> — a <code>.sh</code> file will not double-click.
            Node is installed automatically via winget on first run (accept the
            UAC prompt).
          </li>
          <li>
            <strong>“node is not installed”:</strong> install Node 20+ from{" "}
            <a href="https://nodejs.org" className="text-amber-400 hover:underline">
              nodejs.org
            </a>{" "}
            and run again.
          </li>
          <li>
            <strong>Port 3000 already in use:</strong> stop the other process
            using it, or close the previous app window, then re-run.
          </li>
        </ul>
      </Panel>

      <Panel title="A calculation looks wrong">
        <p className="text-sm text-slate-300">
          All battle mechanics are <strong>provisional</strong> — Pokémon
          Champions&apos; formulas are not publicly documented, so damage, speed,
          abilities, items, and residuals use mainline-derived placeholders and
          are flagged as unverified throughout the app. Differences from the real
          game are expected until the mechanics are confirmed.
        </p>
      </Panel>

      <Panel title="Report a problem">
        <p className="text-sm text-slate-300">
          Open an issue and include:
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-400">
          <li>What you did and what you expected vs. what happened</li>
          <li>The page/route (e.g. <code>/choicedex</code>) and your browser</li>
          <li>Any red error text from the terminal window running the app</li>
        </ul>
        <a
          href={REPO_ISSUES}
          className="mt-3 inline-block rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
        >
          Report an issue on GitHub
        </a>
      </Panel>

      <Link href="/" className="inline-block text-sm text-amber-400 hover:underline">
        ← Back to AssaultDex
      </Link>
    </div>
  );
}
