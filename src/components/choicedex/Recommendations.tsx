import { assumptionsFor } from "@/domain/mechanics/assumptions";
import type { Recommendation } from "@/domain/choicedex/recommend";

/** Presentational list of ranked recommendations (shared by editor views). */
export function Recommendations({
  recommendations,
  profileLabel,
}: {
  recommendations: Recommendation[];
  profileLabel: string;
}) {
  if (recommendations.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No legal actions to rank for the current state.
      </p>
    );
  }
  return (
    <ol className="space-y-4">
      {recommendations.map((rec, i) => (
        <li
          key={i}
          className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="mr-2 rounded bg-amber-500 px-2 py-0.5 text-xs font-bold text-black">
                #{i + 1}
              </span>
              {rec.actionLines.map((line, j) => (
                <span key={j} className="mr-3 text-sm font-medium">
                  {line}
                </span>
              ))}
            </div>
            <div className="text-right text-xs">
              <div className="text-slate-400">
                score{" "}
                <span className="font-mono text-amber-400">
                  {rec.breakdown.total.toFixed(3)}
                </span>
              </div>
              <div className="text-slate-500">
                confidence {(rec.confidence * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <p className="mt-2 text-sm text-slate-300">{rec.expectedPosition}</p>

          {rec.damage.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-slate-400">
              {rec.damage.map((d, k) => {
                const mods = d.damage.modifiers.filter(
                  (m) => m.multiplier !== 1 && m.name !== "type effectiveness",
                );
                return (
                  <li key={k}>
                    {d.attacker} → {d.target} ({d.moveName}): {d.damage.minPercent}
                    –{d.damage.maxPercent}% (exp {d.damage.expectedPercent}%),
                    OHKO {(d.damage.ohkoProbability * 100).toFixed(0)}%, 2HKO{" "}
                    {(d.damage.twoHitKoProbability * 100).toFixed(0)}%,{" "}
                    {d.movesFirst ? "moves first" : "moves second"}
                    {mods.length > 0 && (
                      <span className="text-slate-500">
                        {" "}
                        · {mods.map((m) => `${m.name}×${m.multiplier}`).join(", ")}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-2 flex flex-wrap gap-1 text-xs">
            {rec.breakdown.factors.map((f) => (
              <span
                key={f.name}
                className="rounded bg-slate-800 px-2 py-0.5 text-slate-300"
                title={`raw ${f.raw}, weight ${f.weight}`}
              >
                {f.name}: {f.contribution.toFixed(3)}
              </span>
            ))}
          </div>

          <p className="mt-2 text-xs text-rose-300/80">Risk: {rec.mainRisk}</p>
          <p className="mt-1 text-xs text-slate-500">{rec.explanation}</p>

          <details className="mt-2 text-xs text-slate-500">
            <summary className="cursor-pointer">Assumptions</summary>
            <ul className="mt-1 list-disc pl-4">
              {assumptionsFor(rec.assumptions).map((a) => (
                <li key={a.id}>{a.description}</li>
              ))}
            </ul>
          </details>

          <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-600">
            {profileLabel}
          </p>
        </li>
      ))}
    </ol>
  );
}
