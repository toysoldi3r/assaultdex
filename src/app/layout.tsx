import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AssaultDex",
  description:
    "Competitive Pokémon Champions doubles — Pokédex, team builder, and ChoiceDex (Phase 1 vertical slice).",
};

const NAV = [
  { href: "/", label: "Home" },
  { href: "/pokemon", label: "Pokédex" },
  { href: "/teams", label: "Teams" },
  { href: "/choicedex", label: "ChoiceDex" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-slate-800 bg-slate-900/60">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <span className="text-lg font-bold tracking-tight text-amber-400">
              AssaultDex
            </span>
            <div className="flex gap-4 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="text-slate-300 hover:text-white"
                >
                  {n.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-slate-500">
          Phase 1 vertical slice. Mechanics are <strong>provisional</strong> and
          unverified for Pokémon Champions. Fixture data only — not a live
          provider feed.
        </footer>
      </body>
    </html>
  );
}
