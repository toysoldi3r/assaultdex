// Line icons for the left-dock sections. No icon library — hand-drawn inline
// SVG paths, monochrome, stroked in `currentColor` so they inherit the row's
// text colour (active vs idle) with zero extra styling.

import type { IconName } from "./nav";

const PATHS: Record<IconName, React.ReactNode> = {
  // house
  home: <><path d="M3 9.5 10 4l7 5.5" /><path d="M5 8.5V16h10V8.5" /></>,
  // open book
  guide: <><path d="M10 5.5C8.5 4.3 6 4 4 4.5V15c2-.5 4.5-.2 6 1 1.5-1.2 4-1.5 6-1V4.5c-2-.5-4.5-.2-6 1z" /><path d="M10 6.5v9" /></>,
  // pokéball
  pokedex: <><circle cx="10" cy="10" r="6.5" /><path d="M3.5 10h4M12.5 10h4" /><circle cx="10" cy="10" r="2" /></>,
  // two figures
  teams: <><circle cx="7" cy="7.5" r="2.4" /><circle cx="13.5" cy="8.5" r="2" /><path d="M3.5 16c.4-2.4 2-3.6 3.6-3.6s3.1 1.2 3.5 3.6" /><path d="M12 12.7c1.6 0 3 1 3.4 3.3" /></>,
  // crosshair / target
  choicedex: <><circle cx="10" cy="10" r="6.5" /><circle cx="10" cy="10" r="2.4" /><path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3" /></>,
  // crossed swords
  battles: <><path d="M4 4.5 12 12.5M14 4.5 6 12.5" /><path d="M3 13.5 5.5 16M17 13.5 14.5 16" /></>,
  // database cylinder
  database: <><ellipse cx="10" cy="5" rx="6" ry="2.3" /><path d="M4 5v10c0 1.3 2.7 2.3 6 2.3s6-1 6-2.3V5" /><path d="M4 10c0 1.3 2.7 2.3 6 2.3s6-1 6-2.3" /></>,
  // document with lines
  sources: <><path d="M5 3.5h6l4 4V16.5H5z" /><path d="M11 3.5v4h4" /><path d="M7.5 11h5M7.5 13.5h5" /></>,
};

export function SectionIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {PATHS[name]}
    </svg>
  );
}
