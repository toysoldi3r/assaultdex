"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  /** Sub-tabs revealed on hover, sitting underneath the parent. */
  children?: { href: string; label: string }[];
}

const NAV: NavItem[] = [
  { href: "/guide", label: "Guide" },
  { href: "/pokemon", label: "Pokédex" },
  { href: "/teams", label: "Teams" },
  { href: "/choicedex", label: "ChoiceDex" },
  {
    href: "/database",
    label: "Database",
    children: [
      { href: "/database?tab=items", label: "Items" },
      { href: "/database?tab=abilities", label: "Abilities" },
      { href: "/database?tab=moves", label: "Moves" },
      { href: "/database?tab=calc", label: "Calculator" },
      { href: "/database?tab=terms", label: "Terminology" },
      { href: "/database/knowledgebase", label: "Knowledgebase" },
      { href: "/types", label: "Types" },
    ],
  },
  { href: "/sources", label: "Sources" },
];

function startsWith(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
/** A tab is active on its own path or any of its sub-tabs' paths. */
function isActive(pathname: string, item: NavItem): boolean {
  return startsWith(pathname, item.href) || (item.children ?? []).some((c) => startsWith(pathname, c.href));
}

export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {NAV.map((n) => {
        const active = isActive(pathname, n);
        const children = n.children ?? [];
        return (
          <div key={n.href} className="group relative">
            <Link
              href={n.href}
              aria-current={active ? "page" : undefined}
              // Drop focus after clicking so the hover dropdown doesn't stay
              // pinned open (group-focus-within) once the mouse leaves.
              onClick={(e) => e.currentTarget.blur()}
              className={active ? "font-semibold text-slate-100" : "text-slate-300 hover:text-slate-100"}
            >
              {n.label}
              {children.length > 0 && <span aria-hidden className="ml-0.5 text-[10px] text-slate-500">▾</span>}
            </Link>
            {children.length > 0 && (
              // Padding-top keeps a hover bridge so the menu doesn't close in the gap.
              <div className="invisible absolute left-0 top-full z-40 pt-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div className="min-w-max rounded-md border border-slate-700 bg-slate-900 p-1 shadow-lg">
                  {children.map((c) => {
                    const cActive = startsWith(pathname, c.href);
                    return (
                      <Link
                        key={c.href}
                        href={c.href}
                        aria-current={cActive ? "page" : undefined}
                        onClick={(e) => e.currentTarget.blur()}
                        className={`block rounded px-3 py-1 ${
                          cActive ? "font-semibold text-slate-100" : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                        }`}
                      >
                        {c.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
