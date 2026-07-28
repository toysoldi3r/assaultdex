import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Not found</h2>
      <p className="text-sm text-slate-400">
        That page or Pokémon does not exist in this slice.
      </p>
      <Link href="/" className="text-sm text-amber-400 hover:underline">
        ← Home
      </Link>
    </div>
  );
}
