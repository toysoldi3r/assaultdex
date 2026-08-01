"use client";

// Right-rail card tracking where you've been. Recent routes are recorded on
// every navigation (localStorage-backed, capped); any entry can be pinned so it
// survives out of the recents rotation. Fixed to the right gutter on wide
// screens where it won't overlap the centred max-w-5xl main column.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface NavItem {
  href: string;
  label: string;
}

const RECENT_KEY = "assaultdex.recentNav";
const PIN_KEY = "assaultdex.pinnedNav";
const MAX_RECENT = 8;

function labelFor(path: string): string {
  if (path === "/") return "Home";
  const seg = path.split("/").filter(Boolean);
  const last = seg[seg.length - 1] ?? "";
  const pretty = last
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  // Prefix detail pages with their section, e.g. "Pokédex · Great Tusk".
  if (seg.length > 1) {
    const section = seg[0] === "pokemon" ? "Pokédex" : labelFor("/" + seg[0]);
    return `${section} · ${pretty}`;
  }
  return seg[0] === "pokemon" ? "Pokédex" : pretty;
}

function read(key: string): NavItem[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as NavItem[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, items: NavItem[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* storage unavailable — degrade silently */
  }
}

export function RecentNav() {
  const pathname = usePathname();
  const [recent, setRecent] = useState<NavItem[]>([]);
  const [pinned, setPinned] = useState<NavItem[]>([]);

  // Load persisted state once on mount.
  useEffect(() => {
    setRecent(read(RECENT_KEY));
    setPinned(read(PIN_KEY));
  }, []);

  // Record the current route on every navigation.
  useEffect(() => {
    if (!pathname) return;
    setRecent((prev) => {
      const item: NavItem = { href: pathname, label: labelFor(pathname) };
      const next = [item, ...prev.filter((r) => r.href !== pathname)].slice(
        0,
        MAX_RECENT,
      );
      write(RECENT_KEY, next);
      return next;
    });
  }, [pathname]);

  const pin = (item: NavItem) => {
    setPinned((prev) => {
      if (prev.some((p) => p.href === item.href)) return prev;
      const next = [...prev, item];
      write(PIN_KEY, next);
      return next;
    });
  };

  const unpin = (href: string) => {
    setPinned((prev) => {
      const next = prev.filter((p) => p.href !== href);
      write(PIN_KEY, next);
      return next;
    });
  };

  const pinnedHrefs = new Set(pinned.map((p) => p.href));
  const recentOnly = recent.filter((r) => !pinnedHrefs.has(r.href));

  if (recent.length === 0 && pinned.length === 0) return null;

  return (
    <aside className="fixed right-4 top-24 z-30 hidden w-56 xl:block">
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-sm backdrop-blur">
        {pinned.length > 0 && (
          <div className="mb-3">
            <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Pinned
            </h2>
            <ul className="space-y-0.5">
              {pinned.map((p) => (
                <li key={p.href} className="flex items-center gap-1">
                  <Link
                    href={p.href}
                    className="flex-1 truncate rounded px-1 py-0.5 text-slate-200 hover:bg-slate-800 hover:text-amber-300"
                    title={p.label}
                  >
                    {p.label}
                  </Link>
                  <button
                    onClick={() => unpin(p.href)}
                    aria-label={`Unpin ${p.label}`}
                    className="text-amber-400 hover:text-amber-300"
                  >
                    ★
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Recent
        </h2>
        {recentOnly.length === 0 ? (
          <p className="px-1 text-xs text-slate-600">Nothing new to show.</p>
        ) : (
          <ul className="space-y-0.5">
            {recentOnly.map((r) => (
              <li key={r.href} className="flex items-center gap-1">
                <Link
                  href={r.href}
                  className="flex-1 truncate rounded px-1 py-0.5 text-slate-300 hover:bg-slate-800 hover:text-amber-300"
                  title={r.label}
                >
                  {r.label}
                </Link>
                <button
                  onClick={() => pin(r)}
                  aria-label={`Pin ${r.label}`}
                  className="text-slate-500 hover:text-amber-300"
                >
                  ☆
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
