import Link from "next/link";
import { COMMON_RULES, RULESETS } from "@/data/rulesets";

export function Rulesets() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400">
        Competitive doubles rulesets (&ldquo;Regulations&rdquo;). AssaultDex
        models the active <span className="text-amber-300">Champions Reg M-B</span>{" "}
        format; the rest are listed for context. Summaries are for orientation -
        the official banlists live with the{" "}
        <Link href="/sources" className="text-amber-400 hover:underline">sources</Link>.
      </p>

      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Shared doubles rules</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          {COMMON_RULES.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </section>

      <ul className="grid gap-2 sm:grid-cols-2">
        {RULESETS.map((r) => (
          <li
            key={r.code}
            className={`rounded-lg border bg-slate-900/40 p-3 ${
              r.status === "active" ? "border-amber-500/60" : "border-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs font-bold text-amber-300">{r.code}</span>
              {r.status === "active" && (
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                  Active
                </span>
              )}
              <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-500">{r.game}</span>
            </div>
            <p className="mt-1.5 text-sm font-semibold text-slate-100">{r.name}</p>
            <p className="mt-0.5 text-xs text-slate-400">{r.summary}</p>
            <p className="mt-1.5 text-[11px] text-slate-500">
              <span className="uppercase tracking-wide">Restricted:</span> {r.restricted}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
