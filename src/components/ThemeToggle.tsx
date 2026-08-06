"use client";

// Light/dark switch. Dark is the default; the choice persists in localStorage
// and is applied to <html data-theme> (a pre-paint script in the layout sets it
// before first render, so there is no flash).

import { useEffect, useState } from "react";

const KEY = "assaultdex.theme";

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.dataset.theme === "light");
  }, []);

  const apply = (isLight: boolean) => {
    setLight(isLight);
    const val = isLight ? "light" : "dark";
    document.documentElement.dataset.theme = val;
    try {
      localStorage.setItem(KEY, val);
    } catch {
      /* ignore quota / private mode */
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={light}
      aria-label="Toggle light mode"
      title={light ? "Switch to dark mode" : "Switch to light mode"}
      onClick={() => apply(!light)}
      className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
    >
      <span aria-hidden>{light ? "☀" : "🌙"}</span>
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          light ? "bg-amber-500" : "bg-slate-700"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            light ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
