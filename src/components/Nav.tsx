"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/pokemon", label: "Pokédex" },
  { href: "/teams", label: "Teams" },
  { href: "/choicedex", label: "ChoiceDex" },
  { href: "/battles", label: "Battles" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex gap-4 text-sm">
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
