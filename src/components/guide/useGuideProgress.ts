"use client";

// Browser-remembered Guide progress: the set of lesson ids the reader has
// opened. Same storage key as the previous single-page Guide, so existing
// progress carries over (legacy ids are mapped to their current lesson).

import { useCallback, useEffect, useState } from "react";
import { resolveGuideLessonId } from "@/data/guideLessons";

const STORAGE_KEY = "assaultdex.guide.visited";

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const ids = (JSON.parse(raw) as unknown[])
      .filter((v): v is string => typeof v === "string")
      .map(resolveGuideLessonId)
      .filter((v): v is string => v !== null);
    return new Set(ids);
  } catch {
    return new Set(); // storage blocked or corrupt; progress just won't persist
  }
}

function save(set: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

/** Visited lesson ids. Pass `currentId` to mark that lesson as visited. */
export function useGuideProgress(currentId?: string) {
  const [visited, setVisited] = useState<Set<string>>(new Set());

  useEffect(() => {
    const set = load();
    if (currentId && !set.has(currentId)) {
      set.add(currentId);
      save(set);
    }
    setVisited(set);
  }, [currentId]);

  const reset = useCallback(() => {
    setVisited(new Set());
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  return { visited, reset };
}
