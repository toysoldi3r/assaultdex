import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { RecentNav } from "@/components/RecentNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

// Set the saved theme before first paint so there is no dark→light flash.
const THEME_SCRIPT = `try{document.documentElement.dataset.theme=localStorage.getItem('assaultdex.theme')||'dark'}catch(e){document.documentElement.dataset.theme='dark'}`;

export const metadata: Metadata = {
  title: "AssaultDex",
  description:
    "Competitive Pokémon Champions doubles - Pokédex, team builder, ChoiceDex, and battle analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* Flex column so the footer sits at the bottom on short pages instead of
          floating up. The large scroll buffer that used to live on <main> (which
          pushed the footer far down) is gone; scrollbar-gutter handles the
          dropdown shift, and long editors add their own bottom spacer. */}
      <body className="flex min-h-screen flex-col">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-amber-500 focus:px-3 focus:py-1 focus:text-black"
        >
          Skip to content
        </a>
        <header className="border-b border-slate-800 bg-slate-900/60">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-amber-400 hover:text-amber-300"
            >
              AssaultDex
            </Link>
            <Nav />
            <ThemeToggle />
          </div>
        </header>
        <main id="content" className="mx-auto w-full max-w-7xl flex-1 px-4 pt-8 pb-16">
          {children}
        </main>
        <RecentNav />
        <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-8 text-xs text-slate-500">
          <span>
            Fan-made and unofficial. Pokémon and all related names are
            trademarks of Nintendo, Game Freak, and The Pokémon Company.
          </span>
          <span className="flex items-center gap-x-3">
            <Link href="/help" className="underline hover:text-slate-300">Help</Link>
            <Link href="/privacy" className="underline hover:text-slate-300">Privacy</Link>
            <Link href="/terms" className="underline hover:text-slate-300">Terms</Link>
          </span>
        </footer>
      </body>
    </html>
  );
}
