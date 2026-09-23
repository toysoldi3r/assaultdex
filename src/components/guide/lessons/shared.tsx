"use client";

import { useState } from "react";
import { Card, CardLabel, Chip } from "../ui";

export interface PickOption {
  id: string;
  name: string;
  desc: string;
}

/** "Tap one" card: a row of chips and the selected option's description. */
export function ChipPicker({ label, options, className = "mt-5" }: { label: string; options: PickOption[]; className?: string }) {
  const [active, setActive] = useState(options[0]!.id);
  const current = options.find((o) => o.id === active) ?? options[0]!;
  return (
    <Card className={className}>
      <CardLabel>{label}</CardLabel>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o.id} on={o.id === active} onClick={() => setActive(o.id)}>{o.name}</Chip>
        ))}
      </div>
      <p className="mt-3.5 text-sm leading-[1.55]" style={{ color: "var(--g-body)" }} aria-live="polite">{current.desc}</p>
    </Card>
  );
}

/** Two-choice "what would you do" card with a revealed explanation. */
export function TwoChoice({
  label, prompt, options,
}: {
  label: string;
  prompt?: string;
  options: [{ title: string; sub?: string; answer: string }, { title: string; sub?: string; answer: string }];
}) {
  const [pick, setPick] = useState<0 | 1 | null>(null);
  return (
    <Card className="mt-5 p-5">
      <CardLabel className="mb-3.5">{label}</CardLabel>
      {prompt && <p className="mb-3.5 text-sm" style={{ color: "var(--g-body)" }}>{prompt}</p>}
      <div className="flex gap-3">
        {options.map((o, i) => {
          const on = pick === i;
          return (
            <button
              key={o.title}
              type="button"
              aria-pressed={on}
              onClick={() => setPick(i as 0 | 1)}
              className={`flex-1 cursor-pointer rounded-[10px] border ${o.sub ? "p-3.5 text-left" : "p-3 text-center"}`}
              style={{ borderColor: on ? "var(--g-blue)" : "var(--line)", background: on ? "var(--g-blue-bg)" : "transparent", transition: "background .2s ease, border-color .2s ease" }}
            >
              <div className="text-[13px] font-semibold text-t1">{o.title}</div>
              {o.sub && <div className="mt-1 text-xs" style={{ color: "var(--g-dim)" }}>{o.sub}</div>}
            </button>
          );
        })}
      </div>
      {pick !== null && (
        <p key={pick} className="mt-3.5 text-sm leading-[1.55]" style={{ color: "var(--g-body)", animation: "g-fadeInUp .25s ease" }}>
          {options[pick].answer}
        </p>
      )}
    </Card>
  );
}
