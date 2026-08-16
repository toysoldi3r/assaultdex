"use client";

// Permanent left dock: primary sections, pinned + recent items (ported from the
// old floating RecentNav), and the provisional-mechanics note. Collapses to a
// 44px strip. Recents/pinned storage keys and behaviour are unchanged.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PokeIcon } from "@/components/PokeIcon";
import { SectionIcon } from "./SectionIcon";
import {
  isActive,
  labelFor,
  MAX_RECENT,
  type NavItem,
  PIN_KEY,
  read,
  RECENT_KEY,
  SECTIONS,
  spriteSlug,
  write,
} from "./nav";

function RowIcon({ href }: { href: string }) {
  const slug = spriteSlug(href);
  return slug ? (
    <span className="grid h-[26px] w-10 shrink-0 place-items-center overflow-hidden">
      <PokeIcon species={slug} />
    </span>
  ) : (
    <span className="grid h-[26px] w-10 shrink-0 place-items-center">
      <span className="h-2.5 w-2.5 rounded-sm bg-raise" />
    </span>
  );
}

export function Dock({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const [recent, setRecent] = useState<NavItem[]>([]);
  const [pinned, setPinned] = useState<NavItem[]>([]);

  useEffect(() => {
    setRecent(read(RECENT_KEY));
    setPinned(read(PIN_KEY));
  }, []);

  useEffect(() => {
    if (!pathname) return;
    setRecent((prev) => {
      const item: NavItem = { href: pathname, label: labelFor(pathname) };
      const next = [item, ...prev.filter((r) => r.href !== pathname)].slice(0, MAX_RECENT);
      write(RECENT_KEY, next);
      return next;
    });
  }, [pathname]);

  const pin = (item: NavItem) =>
    setPinned((prev) => {
      if (prev.some((p) => p.href === item.href)) return prev;
      const next = [...prev, item];
      write(PIN_KEY, next);
      return next;
    });
  const unpin = (href: string) =>
    setPinned((prev) => {
      const next = prev.filter((p) => p.href !== href);
      write(PIN_KEY, next);
      return next;
    });
  const removeRecent = (href: string) =>
    setRecent((prev) => {
      const next = prev.filter((r) => r.href !== href);
      write(RECENT_KEY, next);
      return next;
    });

  const pinnedHrefs = new Set(pinned.map((p) => p.href));
  const recentOnly = recent.filter((r) => !pinnedHrefs.has(r.href));

  if (!open) {
    return (
      <aside className="flex flex-col items-center gap-1 border-r border-line bg-panel" style={{ padding: "16px 6px" }}>
        <button
          onClick={onToggle}
          aria-label="Expand navigation"
          className="mb-1 grid h-8 w-8 place-items-center rounded-md border border-line text-[13px] text-t3 hover:text-t2"
        >
          ›
        </button>
        {SECTIONS.map((s) => {
          const active = isActive(pathname, s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              title={s.label}
              aria-label={s.label}
              className={`grid h-8 w-8 place-items-center rounded-md ${active ? "bg-accbg text-acc" : "text-t3 hover:bg-soft hover:text-t2"}`}
            >
              {s.icon && <SectionIcon name={s.icon} />}
            </Link>
          );
        })}
      </aside>
    );
  }

  return (
    <aside
      className="flex min-w-0 flex-col gap-[18px] border-r border-line bg-panel"
      style={{ padding: "16px 12px" }}
    >
      <div>
        <div className="flex items-center justify-between px-2 pb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-t3">Sections</span>
          <button onClick={onToggle} className="text-[11px] text-t3 hover:text-t2">Hide ‹</button>
        </div>
        {SECTIONS.map((s) => {
          const active = isActive(pathname, s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              className={`mb-px flex items-center gap-2.5 rounded-[5px] px-2 py-1.5 text-[13px] font-medium ${
                active ? "bg-accbg text-acc" : "text-t2 hover:bg-soft"
              }`}
            >
              {s.icon && <SectionIcon name={s.icon} />}
              <span>{s.label}</span>
            </Link>
          );
        })}
      </div>

      {pinned.length > 0 && (
        <div>
          <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-t3">Pinned</p>
          {pinned.map((p) => (
            <div key={p.href} className="group flex items-center gap-2 rounded-[5px] px-2 py-1.5 text-[13px] hover:bg-soft">
              <RowIcon href={p.href} />
              <Link href={p.href} className="min-w-0 flex-1 truncate text-t1" title={p.label}>{p.label}</Link>
              <button onClick={() => unpin(p.href)} aria-label={`Unpin ${p.label}`} className="text-acc opacity-0 group-hover:opacity-100">★</button>
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-t3">Recent</p>
        {recentOnly.length === 0 ? (
          <p className="px-2 text-[11px] text-t3">Nothing new to show.</p>
        ) : (
          recentOnly.map((r) => (
            <div key={r.href} className="group flex items-center gap-2 rounded-[5px] px-2 py-1.5 text-[13px] hover:bg-soft">
              <RowIcon href={r.href} />
              <Link href={r.href} className="min-w-0 flex-1 truncate text-t2" title={r.label}>{r.label}</Link>
              <button onClick={() => pin(r)} aria-label={`Pin ${r.label}`} className="text-t3 opacity-0 hover:text-acc group-hover:opacity-100">☆</button>
              <button onClick={() => removeRecent(r.href)} aria-label={`Remove ${r.label}`} className="text-t3 opacity-0 hover:text-neg group-hover:opacity-100">✕</button>
            </div>
          ))
        )}
      </div>

      <div className="mt-auto rounded-md border border-line p-[10px_11px]" style={{ borderLeft: "2px solid var(--accln)", padding: "10px 11px" }}>
        <p className="text-xs font-semibold text-t1">Mechanics are provisional</p>
        <p className="mt-1 text-[11px] leading-4 text-t2">
          Champions battle mechanics aren&apos;t publicly documented. Type chart, speed and damage are mainline-derived placeholders, flagged as unverified wherever they appear.
        </p>
      </div>
    </aside>
  );
}
