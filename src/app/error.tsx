"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log server-side digest only; never surface stack traces to the user.
    console.error("Route error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="space-y-3 rounded-lg border border-rose-900 bg-rose-950/40 p-4">
      <h2 className="text-lg font-semibold text-rose-300">Something went wrong</h2>
      <p className="text-sm text-slate-400">
        {/* Sanitized: never expose stack traces to users (spec). */}
        The page failed to render. If you just set up the project, make sure the
        database is migrated and seeded.
      </p>
      <button
        onClick={reset}
        className="rounded border border-slate-600 px-3 py-1 text-sm hover:border-amber-500"
      >
        Try again
      </button>
    </div>
  );
}
