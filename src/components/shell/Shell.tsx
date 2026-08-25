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

  // Broadcast the nav state so content that reflows on collapse (the Database
  // detail card widens by 148px) can react without prop-drilling through pages.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent<boolean>("assaultdex:nav", { detail: open }));
  }, [open]);

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
      className="flex-1 md:grid"
      style={{ gridTemplateColumns: open ? "216px 1fr" : "44px 1fr", alignItems: "stretch" }}
    >
      {/* Desktop dock only; on mobile the slide-out drawer (MobileNav) is used.
          `hidden md:contents` drops the dock from the flow on mobile while
          letting it participate in the grid at md+. */}
      <div className="hidden md:contents">
        <Dock open={open} onToggle={toggle} />
      </div>
      <main
        id="content"
        className="flex min-w-0 flex-col gap-4 p-4 md:gap-[18px] md:px-6 md:pb-[30px] md:pt-[22px]"
      >
        {children}
      </main>
    </div>
  );
}
