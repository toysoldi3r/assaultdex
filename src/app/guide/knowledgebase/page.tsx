import Link from "next/link";
import { KB_ENTRIES } from "@/data/knowledgebase";

export const metadata = {
  title: "Knowledgebase",
  description: "Plain-language explainers for the competitive building blocks: base stats, EVs, IVs, natures.",
};

export default function KnowledgebasePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/guide" className="text-sm text-amber-400 hover:underline">
          &larr; Guide
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Knowledgebase</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Short explainers for the core competitive building blocks. New to the
          format? The <Link href="/guide" className="text-amber-400 hover:underline">Guide</Link> links here for each term.
        </p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {KB_ENTRIES.map((e) => (
          <li key={e.slug}>
            <Link
              href={`/guide/knowledgebase/${e.slug}`}
              className="block rounded-lg border border-slate-800 bg-slate-900/40 p-3 hover:border-amber-500"
            >
              <span className="font-semibold text-amber-400">{e.title}</span>
              <p className="mt-1 text-sm text-slate-400">{e.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
