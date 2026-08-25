"use client";

// Mobile navigation drawer + the tiny context that lets the top bar's hamburger
// (rendered in the layout, outside <Shell>) open a drawer rendered here. On
// desktop (md+) the permanent <Dock> is used instead and this drawer stays
// mounted but hidden. The drawer mirrors Dock's sections, pinned/recent lists,
// and provisional-mechanics note, and closes on scrim tap, row tap, Escape, or
// route change.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { PokeIcon } from "@/components/PokeIcon";
import {
  isActive,
  MAX_RECENT,
  labelFor,
  type NavItem,
  PIN_KEY,
  read,
  RECENT_KEY,
  SECTIONS,
  spriteSlug,
  write,
} from "./nav";

interface MobileNavCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const Ctx = createContext<MobileNavCtx | null>(null);

export function useMobileNav(): MobileNavCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMobileNav must be used within MobileNavProvider");
  return ctx;
}

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <NavDrawer />
    </Ctx.Provider>
  );
}

function DrawerRowIcon({ href }: { href: string }) {
  const slug = spriteSlug(href);
  return slug ? (
    <span className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-[5px]">
      <PokeIcon species={slug} />
    </span>
  ) : (
    <span className="h-5 w-5 shrink-0 rounded-[5px] bg-raise" />
  );
}

function NavDrawer() {
  const { open, setOpen } = useMobileNav();
  const pathname = usePathname();
  const [recent, setRecent] = useState<NavItem[]>([]);
  const [pinned, setPinned] = useState<NavItem[]>([]);

  useEffect(() => {
    setRecent(read(RECENT_KEY));
    setPinned(read(PIN_KEY));
  }, []);

  // Keep the recent list current from the drawer too (Dock also writes it; the
  // last writer wins and both read the same key, so they converge).
  useEffect(() => {
    if (!pathname) return;
    setRecent((prev) => {
      const item: NavItem = { href: pathname, label: labelFor(pathname) };
      const next = [item, ...prev.filter((r) => r.href !== pathname)].slice(0, MAX_RECENT);
      write(RECENT_KEY, next);
      return next;
    });
  }, [pathname]);

  // Close on route change so the drawer never lingers over a new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  // Escape to close; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, setOpen]);

  const pinnedHrefs = new Set(pinned.map((p) => p.href));
  const recentOnly = recent.filter((r) => !pinnedHrefs.has(r.href));

  return (
    <div
      className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Scrim */}
      <div
        onClick={() => setOpen(false)}
        className={`absolute inset-0 bg-black/55 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`absolute left-0 top-0 flex h-full w-[284px] max-w-[85%] flex-col gap-1 overflow-y-auto border-r border-line bg-panel transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ padding: "18px 12px" }}
      >
        <p className="px-2.5 pb-2 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-t3">
          Sections
        </p>
        {SECTIONS.map((s) => {
          const active = isActive(pathname, s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              onClick={() => setOpen(false)}
              className={`relative flex min-h-[44px] items-center gap-2.5 rounded-md px-2.5 text-[14px] ${
                active ? "bg-accbg font-semibold text-acc" : "font-medium text-t2"
              }`}
            >
              {active && (
                <span className="absolute bottom-2 left-0 top-2 w-0.5 rounded-sm bg-acc" />
              )}
              <DrawerRowIcon href={s.href} />
              {s.label}
            </Link>
          );
        })}

        {pinned.length > 0 && (
          <div className="mt-2">
            <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-t3">
              Pinned
            </p>
            {pinned.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                onClick={() => setOpen(false)}
                className="flex min-h-[40px] items-center gap-2.5 rounded-md px-2.5 text-[13px] text-t1"
              >
                <DrawerRowIcon href={p.href} />
                <span className="truncate">{p.label}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-2">
          <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-t3">
            Recent
          </p>
          {recentOnly.length === 0 ? (
            <p className="px-2.5 text-[11px] text-t3">Nothing new to show.</p>
          ) : (
            recentOnly.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                onClick={() => setOpen(false)}
                className="flex min-h-[40px] items-center gap-2.5 rounded-md px-2.5 text-[13px] text-t2"
              >
                <DrawerRowIcon href={r.href} />
                <span className="truncate">{r.label}</span>
              </Link>
            ))
          )}
        </div>

        <div
          className="mt-auto rounded-lg border border-line"
          style={{ borderLeft: "2px solid var(--accln)", padding: 11 }}
        >
          <p className="text-xs font-semibold text-t1">Mechanics are provisional</p>
          <p className="mt-1 text-[11px] leading-4 text-t2">
            Champions battle mechanics aren&apos;t publicly documented. Type chart, speed and damage
            are mainline-derived placeholders, flagged as unverified wherever they appear.
          </p>
        </div>
      </aside>
    </div>
  );
}
