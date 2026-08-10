import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel, ProvisionalTag } from "@/components/ui";
import { analyzeReplay } from "@/domain/analysis/postBattle";
import { getBattleReplay } from "@/server/repositories/battleRepo";
import { deleteBattleAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function BattleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getBattleReplay(id);
  if (!record) notFound();

  const analysis = analyzeReplay(record.replay, "balanced");

  return (
    <div className="space-y-6">
      <Link href="/battles" className="text-sm text-amber-400 hover:underline">
        ← Battles
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{record.label || "Battle"}</h1>
        <ProvisionalTag />
      </div>

      <Panel title="Summary">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Result" value={analysis.result} />
          <Stat label="Decision quality" value={analysis.decisionQuality.toFixed(3)} />
          <Stat label="Missed KOs" value={String(analysis.missedKos)} />
          <Stat label="Turning points" value={String(analysis.turningPoints)} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Decision quality compares each action against the engine&apos;s
          recommendation on <strong>expected</strong> value, which separates
          decision quality from the random result and from information only
          learned later.
        </p>
      </Panel>

      <Panel title="Turn-by-turn">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-slate-500">
              <tr>
                <th className="p-1">#</th>
                <th className="p-1">Your action</th>
                <th className="p-1">Recommended</th>
                <th className="p-1 text-right">Loss</th>
                <th className="p-1">Flags</th>
              </tr>
            </thead>
            <tbody>
              {analysis.turns.map((t) => (
                <tr key={t.turn} className="border-t border-slate-800 align-top">
                  <td className="p-1 text-slate-500">{t.turn}</td>
                  <td className="p-1 text-slate-200">
                    {t.actualActions.join("; ") || "-"}
                  </td>
                  <td className="p-1 text-slate-400">
                    {t.recommendedActions.join("; ") || "-"}
                  </td>
                  <td
                    className={`p-1 text-right tabular-nums ${
                      t.decisionValueLoss > 0 ? "text-rose-300" : "text-slate-500"
                    }`}
                  >
                    {t.decisionValueLoss}
                  </td>
                  <td className="p-1">
                    <div className="flex flex-wrap gap-1">
                      {t.missedKo && <Flag>missed KO</Flag>}
                      {t.turningPoint && <Flag>turning point</Flag>}
                      {t.highUncertainty && <Flag>uncertain</Flag>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <form action={deleteBattleAction}>
        <input type="hidden" name="id" value={id} />
        <button className="rounded border border-rose-800 px-3 py-1 text-sm text-rose-300 hover:border-rose-500">
          Delete this battle
        </button>
      </form>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900/40 p-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold capitalize text-slate-100">{value}</p>
    </div>
  );
}

function Flag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
      {children}
    </span>
  );
}
