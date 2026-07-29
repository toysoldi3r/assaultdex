import { Panel } from "@/components/ui";

export const metadata = { title: "Privacy — AssaultDex" };

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Privacy</h1>
      <Panel>
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            AssaultDex is a decision-support tool for competitive Pokémon
            Champions doubles. This page describes how the current build handles
            data.
          </p>
          <h2 className="font-semibold text-slate-100">What is stored</h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-400">
            <li>
              Teams, team versions, collections, and battle records you create,
              stored in the application database.
            </li>
            <li>
              Pokémon reference data imported from documented fixtures (not a
              live provider feed in this build).
            </li>
          </ul>
          <h2 className="font-semibold text-slate-100">Accounts</h2>
          <p className="text-slate-400">
            This build has no user accounts or authentication yet, so stored data
            is not tied to a personal identity. Account features and per-user
            isolation are planned for a later phase.
          </p>
          <h2 className="font-semibold text-slate-100">Deleting your data</h2>
          <p className="text-slate-400">
            You can delete individual teams and battles, and clear your entire
            battle history and analytics, from within the app.
          </p>
          <h2 className="font-semibold text-slate-100">Third parties</h2>
          <p className="text-slate-400">
            The app makes no external network requests from the browser in this
            build. External Pokémon/competitive data providers, when added, will
            be accessed only server-side through validated adapters.
          </p>
          <p className="text-xs text-slate-500">
            This is a development build; this notice is provisional and not legal
            advice.
          </p>
        </div>
      </Panel>
    </div>
  );
}
