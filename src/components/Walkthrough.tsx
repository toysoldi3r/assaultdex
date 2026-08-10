"use client";

// A simple step-by-step product tour: a centered modal that walks through a
// sequence of {title, body} steps with Back / Next / Skip. Auto-opens once per
// visitor (localStorage keyed by `id`); the "Take the tour" button reopens it.

import { useEffect, useState } from "react";

export interface WalkStep {
  title: string;
  body: string;
}

export function Walkthrough({
  id,
  steps,
  buttonLabel = "Take the tour",
}: {
  id: string;
  steps: WalkStep[];
  buttonLabel?: string;
}) {
  const key = `assaultdex.tour.${id}`;
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(key)) setOpen(true);
    } catch {
      /* ignore */
    }
  }, [key]);

  const finish = () => {
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
    setI(0);
  };
  const next = () => setI((n) => Math.min(steps.length - 1, n + 1));
  const back = () => setI((n) => Math.max(0, n - 1));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, steps.length]);

  const step = steps[i];
  const last = i === steps.length - 1;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setI(0);
          setOpen(true);
        }}
        className="rounded-md border border-line px-3 py-1 text-xs font-medium text-t2 hover:border-accln hover:text-t1"
      >
        {buttonLabel}
      </button>

      {open && step && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg border border-line bg-panel p-5" style={{ boxShadow: "0 18px 40px rgba(0,0,0,.35)" }}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-t3">
                Step {i + 1} of {steps.length}
              </span>
              <button onClick={finish} className="text-xs text-t3 hover:text-t2">Skip tour ✕</button>
            </div>

            <h3 className="text-base font-semibold text-t1">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-t2">{step.body}</p>

            <div className="mt-5 flex items-center justify-between">
              <div className="flex gap-1">
                {steps.map((_, d) => (
                  <span key={d} className={`h-1.5 w-1.5 rounded-full ${d === i ? "bg-acc" : "bg-raise"}`} />
                ))}
              </div>
              <div className="flex gap-2">
                {i > 0 && (
                  <button onClick={back} className="rounded-md border border-line px-3 py-1 text-sm text-t2 hover:bg-soft">
                    Back
                  </button>
                )}
                {last ? (
                  <button onClick={finish} className="rounded-md bg-acc px-3 py-1 text-sm font-semibold text-white">
                    Finish
                  </button>
                ) : (
                  <button onClick={next} className="rounded-md bg-acc px-3 py-1 text-sm font-semibold text-white">
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
