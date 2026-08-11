// Shared navigation model for the desktop dock and the mobile drawer: the
// primary section list, the pinned/recent localStorage helpers, and the small
// pure helpers both surfaces use. Keeping this in one place means the drawer
// and the dock stay in sync (same sections, same storage keys, same behaviour).

export interface NavItem {
  href: string;
  label: string;
}

export const SECTIONS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/guide", label: "Guide" },
  { href: "/pokemon", label: "Pokédex" },
  { href: "/teams", label: "Teams" },
  { href: "/choicedex", label: "ChoiceDex" },
  { href: "/battles", label: "Battles" },
  { href: "/database", label: "Database" },
  { href: "/sources", label: "Sources" },
];

export const RECENT_KEY = "assaultdex.recentNav";
export const PIN_KEY = "assaultdex.pinnedNav";
export const MAX_RECENT = 8;

export function labelFor(path: string): string {
  if (path === "/") return "Home";
  const seg = path.split("/").filter(Boolean);
  const last = seg[seg.length - 1] ?? "";
  const pretty = last.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  if (seg.length > 1) {
    const section = seg[0] === "pokemon" ? "Pokédex" : labelFor("/" + seg[0]);
    return `${section} · ${pretty}`;
  }
  return seg[0] === "pokemon" ? "Pokédex" : pretty;
}

export function read(key: string): NavItem[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as NavItem[]) : [];
  } catch {
    return [];
  }
}

export function write(key: string, items: NavItem[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

/** Pokémon-detail routes get a sprite; other routes a neutral square. */
export function spriteSlug(href: string): string | null {
  const m = /^\/pokemon\/([a-z0-9]+)$/.exec(href);
  return m ? m[1]! : null;
}

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
