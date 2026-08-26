"use client";

// Course-style Guide: a section/lesson sidebar, a single-lesson content pane,
// prev/next navigation, an overview grid, and browser-remembered progress.
// Lesson content is data (src/data/guideContent) so this shell stays generic.

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  GUIDE_SECTIONS,
  FLAT_LESSONS,
  TOTAL_LESSONS,
} from "@/data/guideContent";

const STORAGE_KEY = "assaultdex.guide.visited";

function AdvBadge() {
  return <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">Advanced</span>;
}

export function GuideApp() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // null = overview; otherwise a lesson id. Deep-linkable via ?lesson=.
  const [current, setCurrent] = useState<string | null>(null);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  // Which sidebar sections are expanded (all open by default).
  const [openSecs, setOpenSecs] = useState<Set<string>>(() => new Set(GUIDE_SECTIONS.map((s) => s.id)));

  // Load remembered progress once.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setVisited(new Set(JSON.parse(raw) as string[]));
    } catch { /* storage blocked; progress just won't persist */ }
  }, []);

  const markVisited = useCallback((id: string) => {
    setVisited((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Honour ?lesson= on load / change (used by in-lesson cross-links). A
  // deep-linked lesson is opened and counted just like a clicked one.
  const urlLesson = params.get("lesson");
  useEffect(() => {
    if (urlLesson && FLAT_LESSONS.some((l) => l.id === urlLesson)) {
      setCurrent(urlLesson);
      markVisited(urlLesson);
    }
  }, [urlLesson, markVisited]);

  const open = useCallback((id: string) => {
    setCurrent(id);
    markVisited(id);
    // Keep the URL in sync so ?lesson deep-links and the browser Back button
    // agree with the on-screen lesson (and cross-links never go stale).
    router.replace(id ? `${pathname}?lesson=${id}` : pathname, { scroll: false });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [markVisited, router, pathname]);

  const toOverview = useCallback(() => {
    setCurrent(null);
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const resetProgress = useCallback(() => {
    setVisited(new Set());
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const idx = current ? FLAT_LESSONS.findIndex((l) => l.id === current) : -1;
  const lesson = idx >= 0 ? FLAT_LESSONS[idx] : null;
  const prev = idx > 0 ? FLAT_LESSONS[idx - 1] : null;
  const next = idx >= 0 && idx < TOTAL_LESSONS - 1 ? FLAT_LESSONS[idx + 1] : null;

  const pct = useMemo(() => Math.round((visited.size / TOTAL_LESSONS) * 100), [visited]);

  return (
    <div className="space-y-4">
      {/* Header: overview link + progress */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={toOverview}
          className={`text-sm ${current === null ? "font-semibold text-slate-100" : "text-amber-400 hover:underline"}`}
        >
          {current === null ? "Guide overview" : "← Guide overview"}
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          <span>{visited.size} / {TOTAL_LESSONS} read</span>
          <span className="h-1.5 w-28 overflow-hidden rounded bg-slate-800">
            <span className="block h-full rounded bg-amber-500" style={{ width: `${pct}%` }} />
          </span>
          {visited.size > 0 && (
            <button onClick={resetProgress} className="text-slate-500 hover:text-amber-400" title="Reset progress">Reset</button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        {/* Sidebar */}
        <aside className="w-full shrink-0 md:w-64">
          <nav className="space-y-2">
            {GUIDE_SECTIONS.map((s, si) => {
              const openSec = openSecs.has(s.id);
              return (
                <div key={s.id} className="rounded-lg border border-slate-800 bg-slate-900/40">
                  <button
                    onClick={() => setOpenSecs((prev) => { const n = new Set(prev); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left"
                  >
                    <span className="text-xs font-bold text-slate-500">{si + 1}</span>
                    <span className="flex-1 text-sm font-semibold text-slate-100">{s.title}</span>
                    <span className="text-slate-500">{openSec ? "▲" : "▼"}</span>
                  </button>
                  {openSec && (
                    <ul className="border-t border-slate-800 py-1">
                      {s.lessons.map((l) => {
                        const active = current === l.id;
                        return (
                          <li key={l.id}>
                            <button
                              onClick={() => open(l.id)}
                              className={`flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-sm ${active ? "bg-slate-800 text-amber-300" : "text-slate-300 hover:bg-slate-800/60"}`}
                            >
                              <span className={`text-xs ${visited.has(l.id) ? "text-amber-400" : "text-slate-600"}`}>{visited.has(l.id) ? "✓" : "○"}</span>
                              <span className="flex-1">{l.title}</span>
                              {l.level === "advanced" && <span className="text-[10px] font-semibold uppercase text-amber-400/80">Adv</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {lesson ? (
            <article className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{lesson.sectionTitle}</div>
              <h1 className="mb-4 flex items-center text-2xl font-bold">
                {lesson.title}
                {lesson.level === "advanced" && <AdvBadge />}
              </h1>
              <div className="max-w-3xl space-y-3 text-sm leading-relaxed">{lesson.body}</div>

              {/* Prev / Next */}
              <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
                {prev ? (
                  <button onClick={() => open(prev.id)} className="min-w-0 rounded border border-slate-700 px-3 py-2 text-left text-sm hover:border-amber-500">
                    <span className="block text-[10px] uppercase tracking-wide text-slate-500">Previous</span>
                    <span className="block truncate text-slate-200">{prev.title}</span>
                  </button>
                ) : <span />}
                {next ? (
                  <button onClick={() => open(next.id)} className="min-w-0 rounded border border-slate-700 px-3 py-2 text-right text-sm hover:border-amber-500">
                    <span className="block text-[10px] uppercase tracking-wide text-slate-500">Next</span>
                    <span className="block truncate text-slate-200">{next.title}</span>
                  </button>
                ) : <span />}
              </div>
            </article>
          ) : (
            <Overview onOpen={open} visited={visited} />
          )}
        </div>
      </div>
    </div>
  );
}

function Overview({ onOpen, visited }: { onOpen: (id: string) => void; visited: Set<string> }) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <h1 className="text-2xl font-bold">Guide</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-300">
          New to competitive Pokémon or to AssaultDex? Start at lesson one and work down.
          Six sections take you from the site itself to building a team. Pick any lesson to begin.
        </p>
      </div>
      {GUIDE_SECTIONS.map((s, si) => (
        <section key={s.id}>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-xs font-bold text-slate-500">{si + 1}</span>
            <h2 className="text-lg font-semibold text-slate-100">{s.title}</h2>
            <span className="text-xs text-slate-500">{s.blurb}</span>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {s.lessons.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => onOpen(l.id)}
                  className="block h-full w-full rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-left hover:border-amber-500"
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`text-xs ${visited.has(l.id) ? "text-amber-400" : "text-slate-600"}`}>{visited.has(l.id) ? "✓" : "○"}</span>
                    <span className="font-semibold text-amber-400">{l.title}</span>
                    {l.level === "advanced" && <AdvBadge />}
                  </span>
                  <p className="mt-1 text-sm text-slate-400">{l.summary}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
