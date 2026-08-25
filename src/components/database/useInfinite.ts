"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Windowed rendering for a long, already-filtered/sorted list: render `step`
 * rows, then reveal `step` more each time a sentinel scrolls into view. The
 * caller passes the FULL filtered+sorted array, so filtering and sorting always
 * apply to the whole dataset — only the number of rendered rows grows.
 *
 * Returns the visible slice and a ref to attach to a sentinel element placed
 * right after the list. A dependency signature resets the window to `step`
 * whenever the underlying filters/sort change.
 */
export function useInfinite<T>(all: T[], resetKey: unknown, step = 50) {
  const [count, setCount] = useState(step);
  const sentinel = useRef<HTMLElement | null>(null);

  // Reset the window when the filtered/sorted set changes.
  useEffect(() => {
    setCount(step);
  }, [resetKey, step]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setCount((c) => (c < all.length ? c + step : c));
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [all.length, step]);

  return { visible: all.slice(0, count), sentinel, hasMore: count < all.length, shown: Math.min(count, all.length) };
}
