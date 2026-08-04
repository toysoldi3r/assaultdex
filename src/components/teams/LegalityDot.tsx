"use client";

// Status dot shown before a team name. Green = legal (hover: "Team is legal").
// Illegal = amber exclamation with a hover tooltip listing the reasons.

import { useState } from "react";

export function LegalityDot({
  legal,
  errors,
}: {
  legal: boolean;
  errors: string[];
}) {
  const [hover, setHover] = useState(false);
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {legal ? (
        <span
          className="inline-block h-3 w-3 rounded-full bg-emerald-500"
          role="img"
          aria-label="Team is legal"
        />
      ) : (
        <span
          className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-black"
          role="img"
          aria-label="Team is not legal"
        >
          !
        </span>
      )}
      {hover && (
        <span className="absolute left-0 top-6 z-30 w-64 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-normal shadow-xl">
          {legal ? (
            <span className="text-emerald-300">Team is legal.</span>
          ) : (
            <>
              <span className="text-rose-300">Not legal:</span>
              <ul className="mt-1 list-disc pl-4 text-rose-200">
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
