"use client";

// Modal card showing a team's Pokémon Showdown paste with a copy-to-clipboard
// button, instead of triggering a .txt download. Fetches the same /export route
// (fetch reads the body regardless of its download header).

import { useEffect, useState } from "react";

export function ExportModal({
  teamId,
  teamName,
  onClose,
}: {
  teamId: string;
  teamName: string;
  onClose: () => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/teams/${teamId}/export`)
      .then((r) => r.text())
      .then((t) => { if (alive) setText(t); })
      .catch(() => { if (alive) setText("Export failed."); });
    return () => { alive = false; };
  }, [teamId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked; the textarea is selectable as a fallback */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-950 p-4 shadow-xl"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-100">
            Export <span className="text-amber-300">{teamName}</span> · Showdown format
          </h3>
          <button onClick={onClose} aria-label="Close" className="rounded px-1.5 text-slate-400 hover:text-slate-200">✕</button>
        </div>
        <textarea
          readOnly
          value={text ?? "Loading…"}
          rows={12}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full resize-none rounded border border-slate-700 bg-slate-900 p-2 font-mono text-xs text-slate-200"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Paste into Pokémon Showdown&apos;s teambuilder import.</span>
          <button
            onClick={copy}
            disabled={!text}
            className="rounded bg-amber-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
