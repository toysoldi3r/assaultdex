"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DisplayMenu } from "./DisplayMenu";
import { useMobileNav } from "./MobileNav";

type Theme = "dark" | "light";

/** A place the jump-to search can send you. `keywords` widen what matches
 *  beyond the visible label (e.g. "calc" finds "Damage calc"). */
type Dest = { label: string; href: string; keywords?: string };

const DESTINATIONS: Dest[] = [
  { label: "Pokédex", href: "/pokemon", keywords: "pokemon species mon dex" },
  { label: "Teams", href: "/teams", keywords: "team builder build" },
  { label: "ChoiceDex", href: "/choicedex", keywords: "choice picker" },
  { label: "Battles", href: "/battles", keywords: "battle replay log" },
  { label: "Damage calc", href: "/database?tab=calc", keywords: "calculator damage dmg" },
  { label: "Moves", href: "/database?tab=moves", keywords: "move attack database" },
  { label: "Abilities", href: "/database?tab=abilities", keywords: "ability database" },
  { label: "Items", href: "/database?tab=items", keywords: "item held database" },
  { label: "Terminology", href: "/database?tab=terms", keywords: "terms glossary jargon" },
  { label: "Guide", href: "/guide", keywords: "guide start help how" },
  { label: "Sources", href: "/sources", keywords: "source data credit" },
  { label: "Home", href: "/", keywords: "home meta ladder dashboard" },
];

/** Top bar: wordmark, jump-to search field, format label, settings button, plus
 *  a hamburger (mobile only) that opens the navigation drawer. The search is a
 *  command-palette style jump-to: it filters app destinations, and always
 *  offers a Pokédex text search as the fallback for free-text queries. */
export function TopBar({ formatLabel }: { formatLabel: string }) {
  const router = useRouter();
  const { setOpen: setNavOpen } = useMobileNav();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  // ⌘K / Ctrl+K focuses the field from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const q = query.trim();
  const matches = useMemo(() => {
    if (!q) return [];
    const needle = q.toLowerCase();
    return DESTINATIONS.filter(
      (d) =>
        d.label.toLowerCase().includes(needle) ||
        (d.keywords?.includes(needle) ?? false),
    );
  }, [q]);

  // A free-text search of the Pokédex is always the last resort.
  const searchHref = q ? `/pokemon?q=${encodeURIComponent(q)}` : "/pokemon";
  const results = q
    ? [...matches, { label: `Search Pokédex for “${q}”`, href: searchHref }]
    : [];

  const go = (href: string) => {
    router.push(href);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

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

      <div className="relative flex min-w-0 flex-1">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go(results[active]?.href ?? searchHref);
          }}
          className="flex h-9 min-w-0 flex-1 items-center rounded-lg border border-line bg-bg px-3.5"
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKeyDown}
            placeholder="Search or jump to…"
            aria-label="Search or jump to"
            aria-expanded={open && results.length > 0}
            role="combobox"
            aria-controls="jumpto-list"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-t1 placeholder:text-t3 focus:outline-none"
          />
        </form>

        {open && results.length > 0 && (
          <ul
            id="jumpto-list"
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-lg border border-line bg-panel py-1 shadow-xl"
          >
            {results.map((r, i) => (
              <li key={r.href} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r.href)}
                  className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] ${
                    i === active ? "bg-accbg text-acc" : "text-t2 hover:bg-soft"
                  }`}
                >
                  <span className="truncate">{r.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
