import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemIcon } from "@/components/ItemIcon";
import { getDbItem } from "@/data/dexDatabase";

export const dynamic = "force-dynamic";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const item = getDbItem(decodeURIComponent(name));
  if (!item) notFound();

  return (
    <div className="space-y-6">
      <Link href="/database" className="text-sm text-amber-400 hover:underline">
        ← Database
      </Link>

      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded bg-slate-800/50">
          <ItemIcon item={item.name} />
        </span>
        <h1 className="text-2xl font-bold">{item.name}</h1>
      </div>

      <section className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm">
        <p className="text-slate-300">{item.desc}</p>
        {item.fling != null && (
          <p className="text-xs text-slate-400">Fling base power: <span className="tabular-nums">{item.fling}</span></p>
        )}
        {item.calc && (
          <p className="text-xs text-emerald-300">
            <span className="font-semibold">Calculation:</span> {item.calc}
          </p>
        )}
      </section>

      {item.interaction && (
        <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">Special interactions</h2>
          <p className="text-sm text-amber-200/90">{item.interaction}</p>
        </section>
      )}

      <p className="text-[10px] uppercase tracking-wide text-slate-600">
        Per-item usage (common holders / moves) needs a usage dataset that is not
        available offline for Champions yet.
      </p>
    </div>
  );
}
