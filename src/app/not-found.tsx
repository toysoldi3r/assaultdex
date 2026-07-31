import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Not found</h2>
      <p className="text-sm text-slate-400">
        That page or Pokémon does not exist.
      </p>
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm text-amber-400 hover:underline">
          ← Home
        </Link>
        <Link href="/help" className="text-sm text-amber-400 hover:underline">
          Help
        </Link>
      </div>
    </div>
  );
}
