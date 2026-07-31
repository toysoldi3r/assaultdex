import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "AssaultDex",
  description:
    "Competitive Pokémon Champions doubles — Pokédex, team builder, ChoiceDex, and battle analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-amber-500 focus:px-3 focus:py-1 focus:text-black"
        >
          Skip to content
        </a>
        <header className="border-b border-slate-800 bg-slate-900/60">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-amber-400 hover:text-amber-300"
            >
              AssaultDex
            </Link>
            <Nav />
          </div>
        </header>
        <main id="content" className="mx-auto max-w-5xl px-4 py-8">
          {children}
        </main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-slate-500">
          Mechanics are <strong>provisional</strong> and unverified for Pokémon
          Champions. Fixture data only — not a live provider feed.{" "}
          <Link href="/help" className="underline hover:text-slate-300">
            Help
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="underline hover:text-slate-300">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="underline hover:text-slate-300">
            Terms
          </Link>
        </footer>
      </body>
    </html>
  );
}
