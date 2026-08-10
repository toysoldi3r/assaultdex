import { Panel } from "@/components/ui";

export const metadata = { title: "Privacy - AssaultDex" };

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Privacy</h1>
      <Panel>
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            AssaultDex is built to be private by default. It has no user
            accounts, runs no advertising, and does not track you across the web.
            This page explains what little data is involved.
          </p>

          <div>
            <h2 className="font-semibold text-slate-100">What is stored</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-400">
              <li>
                Teams, team versions, collections, and battle records you create
                are saved in the application&apos;s own database so they persist
                between visits.
              </li>
              <li>
                Small preferences are kept in your browser&apos;s local storage
                only: your light/dark theme, the current ChoiceDex session, and
                whether you have dismissed the one-time intro tips. Clearing your
                browser data removes them.
              </li>
              <li>
                Pokémon reference data is served from data committed inside the
                app; it contains no information about you.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-slate-100">No accounts, no tracking</h2>
            <p className="mt-1 text-slate-400">
              There is no sign-up and no login, so stored teams and battles are
              not tied to a personal identity. There are no advertising cookies,
              no analytics profiles, and no third-party trackers.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-100">Third parties</h2>
            <p className="mt-1 text-slate-400">
              The pages you use make no external requests from your browser to
              third-party services. Metagame statistics are refreshed out of band
              from public data and committed into the app ahead of time, so
              nothing about your visit is sent to a data provider. Links to
              external sites (on the Sources page) open in a new tab and are
              governed by those sites&apos; own policies.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-100">Deleting your data</h2>
            <p className="mt-1 text-slate-400">
              You can delete individual teams and battles, and clear your entire
              battle history and analytics, from within the app. Browser-stored
              preferences are removed by clearing this site&apos;s data in your
              browser.
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
