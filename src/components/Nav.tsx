"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/guide", label: "Guide" },
  { href: "/pokemon", label: "Pokédex" },
  { href: "/teams", label: "Teams" },
  { href: "/choicedex", label: "ChoiceDex" },
  { href: "/database", label: "Database" },
  { href: "/types", label: "Types" },
  { href: "/battles", label: "Battles" },
  { href: "/sources", label: "Sources" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {NAV.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={
              active ? "font-semibold text-white" : "text-slate-300 hover:text-white"
            }
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
