"use client";

// One-time intro shown on first visit to a page. Dismissing it stores a flag in
// localStorage keyed by `id`, so it never reappears for that visitor.

import { useEffect, useState } from "react";

export function OnceTutorial({
  id,
  title,
  points,
}: {
  id: string;
  title: string;
  points: string[];
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(`assaultdex.tut.${id}`)) setShow(true);
    } catch {
      /* ignore */
    }
  }, [id]);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(`assaultdex.tut.${id}`, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-amber-300">{title}</h2>
        <button
          onClick={dismiss}
          className="shrink-0 rounded border border-slate-600 px-2 py-0.5 text-xs hover:border-amber-500"
        >
          Got it ✕
        </button>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-slate-300">
        {points.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </div>
  );
}
