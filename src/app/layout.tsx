import type { Metadata } from "next";
import Link from "next/link";
import { Instrument_Sans, Space_Mono } from "next/font/google";
import { TopBar } from "@/components/shell/TopBar";
import { Shell } from "@/components/shell/Shell";
import { MobileNavProvider } from "@/components/shell/MobileNav";
import { CHAMPIONS_FORMAT_LABEL } from "@/data/usageStats";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument-sans",
  display: "swap",
});
const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AssaultDex - Competitive Pokémon Champions doubles toolkit",
    template: "%s - AssaultDex",
  },
  description:
    "Competitive Pokémon Champions doubles - Pokédex, team builder, ChoiceDex, and battle analysis.",
};

// Set the saved theme and sprite style before first paint so there is no
// dark→light flash and sprites hydrate in the chosen style (no pixel→art flash).
const THEME_SCRIPT = `try{var d=document.documentElement.dataset;d.theme=localStorage.getItem('assaultdex.theme')||'dark';d.sprite=localStorage.getItem('assaultdex.spriteStyle')||'pixel'}catch(e){document.documentElement.dataset.theme='dark';document.documentElement.dataset.sprite='pixel'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-acc focus:px-3 focus:py-1 focus:text-bg"
        >
          Skip to content
        </a>
        <MobileNavProvider>
          <TopBar formatLabel={CHAMPIONS_FORMAT_LABEL} />
          <Shell>{children}</Shell>
        </MobileNavProvider>
        <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-6 py-4 text-[11px] text-t3">
          <span>
            Fan-made and unofficial. Pokémon and all related names are trademarks
            of Nintendo, Game Freak, and The Pokémon Company.
          </span>
          <span className="flex items-center gap-x-3">
            <Link href="/help" className="underline hover:text-t2">Help</Link>
            <Link href="/faq" className="underline hover:text-t2">FAQ</Link>
            <Link href="/privacy" className="underline hover:text-t2">Privacy</Link>
            <Link href="/terms" className="underline hover:text-t2">Terms</Link>
          </span>
        </footer>
      </body>
    </html>
  );
}
