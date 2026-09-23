"use client";

// Frame for every lesson page: the sticky sidebar (topic list + position
// progress bar), the topic eyebrow and title, the lesson body, and
// previous/next links. Opening a lesson marks it visited.

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  GUIDE_TOPICS, GUIDE_LESSONS, TOTAL_GUIDE_LESSONS, getGuideLesson, guideLessonHref,
} from "@/data/guideLessons";
import { useGuideProgress } from "./useGuideProgress";
import { AdvancedTag } from "./GuideLanding";
import { ProgressBar } from "./ui";

function GuideNav({ currentId, visited }: { currentId: string; visited: Set<string> }) {
  const idx = Math.max(0, GUIDE_LESSONS.findIndex((l) => l.id === currentId));
  // Tracks position in the course, so it moves back when revisiting a lesson.
  const pct = Math.round(((idx + 1) / TOTAL_GUIDE_LESSONS) * 100);
  return (
    <nav
      aria-label="Guide lessons"
      className="w-full shrink-0 md:sticky md:top-0 md:max-h-screen md:w-[240px] md:self-start md:overflow-y-auto md:pb-10 md:pl-2 md:pr-3 md:pt-7"
    >
      <Link href="/guide" className="mb-5 block text-xs no-underline hover:underline" style={{ color: "var(--g-muted)" }}>
        ← All topics
      </Link>
      <div className="mb-[22px] flex items-center gap-2">
        <ProgressBar pct={pct} />
        <span className="shrink-0 whitespace-nowrap mono text-[11px]" style={{ color: "var(--g-dim)" }}>
          {idx + 1}/{TOTAL_GUIDE_LESSONS}
        </span>
      </div>
      <div className="hidden md:block">
        {GUIDE_TOPICS.map((t) => (
          <div key={t.id} className="mb-4">
            <div className="mb-1.5 px-2.5 text-[10px] font-bold tracking-[.04em]" style={{ color: "var(--g-faint)" }}>{t.title}</div>
            <div className="flex flex-col gap-px">
              {t.lessons.map((l) => {
                const active = l.id === currentId;
                return (
                  <Link
                    key={l.id}
                    href={guideLessonHref(l.id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center rounded-lg px-2.5 py-[7px] text-[13px] no-underline hover:bg-raise ${active ? "bg-raise font-bold" : "font-medium"}`}
                    style={{ color: active ? "var(--t1)" : visited.has(l.id) ? "var(--acc)" : "var(--g-muted)" }}
                  >
                    {l.title}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}

export function LessonShell({ lessonId, children }: { lessonId: string; children: ReactNode }) {
  const lesson = getGuideLesson(lessonId)!;
  const { visited } = useGuideProgress(lessonId);
  const router = useRouter();
  const prev = lesson.index > 0 ? GUIDE_LESSONS[lesson.index - 1] : null;
  const next = lesson.index < TOTAL_GUIDE_LESSONS - 1 ? GUIDE_LESSONS[lesson.index + 1] : null;

  // ← / → step through lessons (ignored in form fields and with modifiers).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft" && prev) router.push(guideLessonHref(prev.id));
      else if (e.key === "ArrowRight" && next) router.push(guideLessonHref(next.id));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, router]);

  return (
    <div className="guide-page flex flex-col gap-4 md:flex-row md:items-start md:gap-0">
      <GuideNav currentId={lessonId} visited={visited} />
      <div className="flex min-w-0 flex-1 justify-center">
        <article className="w-full max-w-[900px] pb-24 md:px-8 md:pt-10">
          <div>
            <span className="text-[11px] font-bold tracking-[.02em]" style={{ color: "var(--acc)" }}>{lesson.topicTitle}</span>
            {lesson.advanced && <AdvancedTag className="ml-2" />}
            <h1 className="mt-2 text-[28px] font-bold text-t1">{lesson.title}</h1>
          </div>
          {children}
          <div className="mt-12 flex justify-between gap-3 border-t border-line pt-5">
            {prev ? (
              <Link href={guideLessonHref(prev.id)} className="text-[13px] no-underline hover:underline" style={{ color: "var(--g-muted)" }}>
                ← Previous: {prev.title}
              </Link>
            ) : <span />}
            {next ? (
              <Link href={guideLessonHref(next.id)} className="text-right text-[13px] no-underline hover:underline" style={{ color: "var(--g-muted)" }}>
                Next: {next.title} →
              </Link>
            ) : <span />}
          </div>
        </article>
      </div>
    </div>
  );
}
