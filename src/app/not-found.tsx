import Link from "next/link";

export const metadata = {
  title: "Page not found",
  description: "That page does not exist. Head back to AssaultDex.",
};

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/pokemon", label: "Pokédex" },
  { href: "/teams", label: "Teams" },
  { href: "/choicedex", label: "ChoiceDex" },
  { href: "/database", label: "Database" },
  { href: "/help", label: "Help" },
];

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg space-y-5 py-10 text-center">
      <p className="font-mono text-5xl font-bold text-acc">404</p>
      <h1 className="text-2xl font-bold text-t1">This page got knocked out</h1>
      <p className="text-sm text-t2">
        The page you were after does not exist, or moved. Try one of these
        instead.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-t1 hover:border-accln"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
