"use client";

// Guide landing page: a short intro, one "Start the guide" call to action, the
// overall progress bar, and the six topics as an accordion (one-lesson topics
// link straight to that lesson). Visited lessons turn blue.

import Link from "next/link";
import { useState } from "react";
import { GUIDE_TOPICS, TOTAL_GUIDE_LESSONS, GUIDE_LESSONS, guideLessonHref } from "@/data/guideLessons";
import { useGuideProgress } from "./useGuideProgress";
import { ProgressBar } from "./ui";

const numBox =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-raise mono text-[13px] font-bold";

export function GuideLanding() {
  const { visited } = useGuideProgress();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const done = GUIDE_LESSONS.filter((l) => visited.has(l.id)).length;
  const pct = Math.round((done / TOTAL_GUIDE_LESSONS) * 100);
  const color = (id: string) => (visited.has(id) ? "var(--acc)" : "var(--t1)");

  return (
    <div className="guide-page">
      <div className="mx-auto max-w-[760px] px-2 pb-10 pt-10 text-center sm:px-6 sm:pt-14">
        <span className="text-[11px] font-bold tracking-[.04em]" style={{ color: "var(--g-gold)" }}>Guide</span>
        <h1 className="mt-2.5 text-[28px] font-bold tracking-[-0.01em] text-t1 sm:text-[34px]">Learn to play, one topic at a time</h1>
        <p className="mx-auto mt-3.5 max-w-[520px] text-[15px] leading-[1.6]" style={{ color: "var(--g-muted)" }}>
          Six short topics take you from &quot;what is this site&quot; to building your first competitive team. No
          experience needed, work through them in order or jump to what you need.
        </p>

        <div className="mx-auto mt-[22px] flex max-w-[260px] items-center gap-2.5">
          <ProgressBar pct={pct} />
          <span className="shrink-0 whitespace-nowrap mono text-xs" style={{ color: "var(--g-dim)" }}>
            {done}/{TOTAL_GUIDE_LESSONS} done
          </span>
        </div>

        <div className="mt-5">
          <Link
            href={guideLessonHref("start-here")}
            className="inline-flex items-center gap-1.5 rounded-[10px] px-[22px] py-3 text-sm font-bold no-underline hover:opacity-90"
            style={{ background: "var(--g-gold)", color: "var(--g-on-gold)" }}
          >
            Start the guide →
          </Link>
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--g-dim)" }}>or browse all six topics below</p>
      </div>

      <div className="mx-auto flex max-w-[760px] flex-col gap-3 px-0 pb-20 sm:px-6">
        {GUIDE_TOPICS.map((t, i) => {
          const single = t.lessons.length === 1;
          const isOpen = !!open[t.id];
          if (single) {
            const l = t.lessons[0]!;
            return (
              <div key={t.id} className="overflow-hidden rounded-[14px] border border-line bg-panel">
                <Link href={guideLessonHref(l.id)} className="flex w-full items-center gap-3.5 px-5 py-[18px] no-underline hover:bg-raise">
                  <span className={numBox} style={{ color: "var(--g-muted)" }}>{i + 1}</span>
                  <span className="flex-1 text-left">
                    <span className="block text-base font-semibold" style={{ color: color(l.id) }}>{t.title}</span>
                    <span className="mt-0.5 block text-[13px]" style={{ color: "var(--g-dim)" }}>{t.blurb}</span>
                  </span>
                  <span className="shrink-0 text-[15px]" style={{ color: "var(--g-dim)" }}>→</span>
                </Link>
              </div>
            );
          }
          return (
            <div key={t.id} className="overflow-hidden rounded-[14px] border border-line bg-panel">
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [t.id]: !o[t.id] }))}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer items-center gap-3.5 px-5 py-[18px] text-left"
              >
                <span className={numBox} style={{ color: "var(--g-muted)" }}>{i + 1}</span>
                <span className="flex-1">
                  <span className="block text-base font-semibold text-t1">{t.title}</span>
                  <span className="mt-0.5 block text-[13px]" style={{ color: "var(--g-dim)" }}>
                    {t.blurb} · {t.lessons.length} lessons
                  </span>
                </span>
                <span className="mono text-[15px]" style={{ color: "var(--g-dim)" }}>{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className="flex flex-col gap-0.5 border-t border-line px-3 pb-3 pt-1.5">
                  {t.lessons.map((l) => (
                    <Link key={l.id} href={guideLessonHref(l.id)} className="flex items-center gap-3 rounded-[10px] p-3 no-underline hover:bg-raise">
                      <span className="flex-1">
                        <span className="text-sm font-semibold" style={{ color: color(l.id) }}>{l.title}</span>
                        {l.advanced && <AdvancedTag className="ml-2" />}
                        <span className="mt-0.5 block text-[13px]" style={{ color: "var(--g-dim)" }}>{l.blurb}</span>
                      </span>
                      <span className="shrink-0 text-[15px]" style={{ color: "var(--g-dim)" }}>→</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdvancedTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.04em] ${className}`}
      style={{ color: "var(--g-gold)", background: "var(--g-gold-bg)" }}
    >
      Advanced
    </span>
  );
}
