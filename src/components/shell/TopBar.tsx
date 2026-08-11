"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DisplayMenu } from "./DisplayMenu";
import { useMobileNav } from "./MobileNav";

type Theme = "dark" | "light";

/** Top bar: wordmark, jump-to search field, format label, settings button, plus
 *  a hamburger (mobile only) that opens the navigation drawer. */
export function TopBar({ formatLabel }: { formatLabel: string }) {
  const router = useRouter();
  const { setOpen: setNavOpen } = useMobileNav();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  return (
    <header
      className="relative flex items-center gap-2.5 border-b border-line bg-panel px-4 md:gap-4 md:px-5 md:py-3"
      style={{ minHeight: 56 }}
    >
      <button
        onClick={() => setNavOpen(true)}
        aria-label="Open navigation"
        className="flex h-9 w-9 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-line text-t2 md:hidden"
      >
        {[0, 1, 2].map((i) => (
          <span key={i} className="rounded-[1px] bg-current" style={{ width: 16, height: 1.5 }} />
        ))}
      </button>

      <Link
        href="/"
        className="flex flex-shrink-0 items-center gap-[9px] md:w-[196px]"
      >
        <span className="rounded-[3px] bg-acc" style={{ width: 13, height: 13 }} />
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-t1">AssaultDex</span>
      </Link>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          router.push(q ? `/pokemon?q=${encodeURIComponent(q)}` : "/pokemon");
        }}
        className="flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-line bg-bg px-3.5"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search or jump to…"
          aria-label="Search or jump to"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-t1 placeholder:text-t3 focus:outline-none"
        />
        <span className="mono hidden text-[11px] text-t3 sm:inline">⌘K</span>
      </form>

      <span className="hidden flex-shrink-0 text-xs text-t2 md:inline">{formatLabel}</span>

      <button
        onClick={() => setSettingsOpen((o) => !o)}
        aria-label="Display settings"
        aria-expanded={settingsOpen}
        className={`flex flex-shrink-0 flex-col items-center justify-center gap-[3px] rounded-md border ${
          settingsOpen ? "border-accln bg-accbg text-acc" : "border-line text-t3 hover:text-t2"
        }`}
        style={{ width: 32, height: 30 }}
      >
        {[0, 1, 2].map((i) => (
          <span key={i} className="rounded-[1px] bg-current" style={{ width: 14, height: 1.5 }} />
        ))}
      </button>

      <DisplayMenu open={settingsOpen} onClose={() => setSettingsOpen(false)} theme={theme} onTheme={setTheme} />
    </header>
  );
}
