"use client";

// App shell body: the dock + content grid. Owns the dock collapse state
// (persisted at assaultdex.navCollapsed) so the grid template can react to it.

import { useEffect, useState } from "react";
import { Dock } from "./Dock";

const COLLAPSE_KEY = "assaultdex.navCollapsed";

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    // Open by default; only collapse if the user has explicitly collapsed it.
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setOpen(false);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () =>
    setOpen((o) => {
      const next = !o;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "0" : "1");
      } catch {
        /* ignore */
      }
      return next;
    });

  return (
    <div
      className="grid flex-1"
      style={{ gridTemplateColumns: open ? "216px 1fr" : "44px 1fr", alignItems: "stretch" }}
    >
      <Dock open={open} onToggle={toggle} />
      <main id="content" className="flex min-w-0 flex-col gap-[18px]" style={{ padding: "22px 24px 30px" }}>
        {children}
      </main>
    </div>
  );
}
