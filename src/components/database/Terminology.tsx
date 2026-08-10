import Link from "next/link";
import { TERMS } from "@/data/terminology";

export function Terminology() {
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-400">
        Common competitive terms and abbreviations. Open a term for a fuller
        explanation and a diagram.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {TERMS.map((t) => (
          <Link
            key={t.slug}
            href={`/database/terminology/${t.slug}`}
            className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 hover:border-amber-500/60"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-amber-300">{t.term}</span>
              <span className="text-xs text-slate-600">→</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-300">{t.short}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
