"use client";

// Status dot shown before a team name. Three states:
//   green  - legal, nothing to look at
//   amber  - legal, but advisory flags are open (missing item, short EVs, …)
//   red    - illegal (a member breaks a hard rule)
// Hovering shows the reasons.

import { useState } from "react";

export function LegalityDot({
  legal,
  hasFlags = false,
  errors,
}: {
  legal: boolean;
  hasFlags?: boolean;
  errors: string[];
}) {
  const [hover, setHover] = useState(false);
  const state = !legal ? "illegal" : hasFlags ? "flags" : "legal";
  const color = state === "illegal" ? "var(--neg)" : state === "flags" ? "var(--warn)" : "var(--pos)";
  const label =
    state === "illegal" ? "Team is not legal" : state === "flags" ? "Team is legal, with flags to review" : "Team is legal";

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span
        role="img"
        aria-label={label}
        className="inline-block rounded-full"
        style={{ height: 9, width: 9, background: color, boxShadow: `0 0 0 3px ${color}29` }}
      />
      {hover && (
        <span className="absolute left-0 top-6 z-30 w-64 rounded border border-line bg-panel px-3 py-2 text-xs font-normal shadow-xl">
          {state === "legal" ? (
            <span className="text-pos">{label}.</span>
          ) : (
            <>
              <span className={state === "illegal" ? "text-neg" : "text-warn"}>{label}:</span>
              <ul className="mt-1 list-disc pl-4 text-t2">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </>
          )}
        </span>
      )}
    </span>
  );
}
