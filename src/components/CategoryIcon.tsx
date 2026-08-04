// Move-category icon approximating the in-game Physical / Special / Status
// badges (self-contained inline SVG — no external asset, CSP-safe).

import type { ReactNode } from "react";
import type { MoveCategory } from "@/components/teams/moveTypes";

const STYLE: Record<MoveCategory, { bg: string; glyph: ReactNode; label: string }> = {
  physical: {
    bg: "#f08030",
    label: "Physical",
    glyph: <path d="M4 8 L8 3 L9 6 L12 5 L8 12 L7 9 Z" fill="#fff" />,
  },
  special: {
    bg: "#6890f0",
    label: "Special",
    glyph: <circle cx="8" cy="8" r="3.4" fill="none" stroke="#fff" strokeWidth="1.6" />,
  },
  status: {
    bg: "#8a8a99",
    label: "Status",
    glyph: (
      <g fill="#fff">
        <circle cx="5" cy="8" r="1.1" />
        <circle cx="8" cy="8" r="1.1" />
        <circle cx="11" cy="8" r="1.1" />
      </g>
    ),
  },
};

export function CategoryIcon({ category }: { category: MoveCategory }) {
  const s = STYLE[category];
  return (
    <span title={s.label} aria-label={s.label} className="inline-flex">
      <svg width="18" height="16" viewBox="0 0 16 16" className="rounded-sm">
        <rect width="16" height="16" rx="3" fill={s.bg} />
        {s.glyph}
      </svg>
    </span>
  );
}
