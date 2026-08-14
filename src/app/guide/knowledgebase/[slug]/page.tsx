import Link from "next/link";
import { notFound } from "next/navigation";
import { KB_ENTRIES, getKbEntry, kbTitle } from "@/data/knowledgebase";

export function generateStaticParams() {
  return KB_ENTRIES.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getKbEntry(slug);
  return entry
    ? { title: entry.title, description: entry.summary }
    : { title: "Knowledgebase", description: "Competitive building-block explainers." };
}

export default async function KnowledgebaseEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getKbEntry(slug);
  if (!entry) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/guide/knowledgebase" className="text-sm text-amber-400 hover:underline">
          &larr; Knowledgebase
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{entry.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">{entry.summary}</p>
      </div>

      <div className="space-y-5">
        {entry.sections.map((s, i) => (
          <section key={i} className="max-w-3xl">
            {s.heading && (
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
                {s.heading}
              </h2>
            )}
            <div className="space-y-2 text-sm text-slate-300">
              {s.body.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {entry.related && entry.related.length > 0 && (
        <div className="max-w-3xl border-t border-slate-800 pt-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Related</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {entry.related.map((r) => (
              <Link
                key={r}
                href={`/guide/knowledgebase/${r}`}
                className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-amber-500"
              >
                {kbTitle(r)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
