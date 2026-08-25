// Shared navigation model for the desktop dock and the mobile drawer: the
// primary section list, the pinned/recent localStorage helpers, and the small
// pure helpers both surfaces use. Keeping this in one place means the drawer
// and the dock stay in sync (same sections, same storage keys, same behaviour).

/** Icon key for a primary section (drawn by SectionIcon). */
export type IconName =
  | "home" | "guide" | "pokedex" | "teams"
  | "choicedex" | "battles" | "database" | "sources";

export interface NavItem {
  href: string;
  label: string;
  /** Section rows carry an icon; recent/pinned rows do not. */
  icon?: IconName;
}

export const SECTIONS: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/guide", label: "Guide", icon: "guide" },
  { href: "/pokemon", label: "Pokédex", icon: "pokedex" },
  { href: "/teams", label: "Teams", icon: "teams" },
  { href: "/choicedex", label: "ChoiceDex", icon: "choicedex" },
  { href: "/battles", label: "Battles", icon: "battles" },
  { href: "/database", label: "Database", icon: "database" },
  { href: "/sources", label: "Sources", icon: "sources" },
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
