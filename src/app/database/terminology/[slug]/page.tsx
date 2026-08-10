import Link from "next/link";
import { notFound } from "next/navigation";
import { TERMS, getTerm } from "@/data/terminology";
import { TermVisual } from "@/components/database/TermVisual";

export function generateStaticParams() {
  return TERMS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getTerm(slug);
  return { title: t ? `${t.term} - AssaultDex` : "Terminology - AssaultDex" };
}

export default async function TermPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getTerm(slug);
  if (!t) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/database?tab=terms" className="text-sm text-amber-400 hover:underline">
          &larr; Terminology
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{t.term}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">{t.short}</p>
      </div>

      <div className="max-w-3xl">
        <TermVisual kind={t.visual} />
      </div>

      <div className="max-w-3xl space-y-3 text-sm text-slate-300">
        {t.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="max-w-3xl border-t border-slate-800 pt-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">More terms</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {TERMS.filter((x) => x.slug !== t.slug).map((x) => (
            <Link
              key={x.slug}
              href={`/database/terminology/${x.slug}`}
              className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-amber-500"
            >
              {x.term}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
