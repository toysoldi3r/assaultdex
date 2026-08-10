"use client";

// App shell body: the dock + content grid. Owns the dock collapse state
// (persisted at assaultdex.navCollapsed) so the grid template can react to it.

import { useEffect, useState } from "react";
import { Dock } from "./Dock";

const COLLAPSE_KEY = "assaultdex.navCollapsed";

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSE_KEY);
      if (stored === "1") setOpen(false);
      else if (stored === "0") setOpen(true);
      // No stored preference: start collapsed on narrower viewports.
      else if (window.innerWidth < 1100) setOpen(false);
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
