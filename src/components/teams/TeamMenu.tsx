"use client";

// Three-dot overflow menu for a team page: Export / Duplicate / Delete plus
// toggle-open Notes and Version history sections. Keeps the header uncluttered.

import { useEffect, useRef, useState } from "react";
import {
  deleteTeamAction,
  duplicateTeamAction,
  restoreVersionAction,
  updateNotesAction,
} from "@/app/teams/actions";

export interface MenuVersion {
  versionNumber: number;
  label: string | null;
  members: number;
  createdAt: string;
}

export function TeamMenu({
  teamId,
  notes,
  versions,
  latest,
}: {
  teamId: string;
  notes: string;
  versions: MenuVersion[];
  latest: number;
}) {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState<"notes" | "versions" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Team menu"
        className="rounded border border-slate-600 px-3 py-1 text-lg leading-none hover:border-amber-500"
      >
        ⋯
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-44 rounded border border-slate-700 bg-slate-950 py-1 text-sm shadow-xl">
          <a
            href={`/teams/${teamId}/export`}
            className="block px-3 py-1.5 hover:bg-slate-800"
            onClick={() => setOpen(false)}
          >
            Export (Showdown)
          </a>
          <button
            onClick={() => {
              setShow(show === "notes" ? null : "notes");
              setOpen(false);
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-slate-800"
          >
            Notes
          </button>
          <button
            onClick={() => {
              setShow(show === "versions" ? null : "versions");
              setOpen(false);
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-slate-800"
          >
            Version history ({versions.length})
          </button>
          <form action={duplicateTeamAction}>
            <input type="hidden" name="teamId" value={teamId} />
            <button className="block w-full px-3 py-1.5 text-left hover:bg-slate-800">
              Duplicate
            </button>
          </form>
          <form action={deleteTeamAction}>
            <input type="hidden" name="teamId" value={teamId} />
            <button className="block w-full px-3 py-1.5 text-left text-rose-300 hover:bg-slate-800">
              Delete
            </button>
          </form>
        </div>
      )}

      {show === "notes" && (
        <div className="absolute right-0 z-20 mt-1 w-72 rounded border border-slate-700 bg-slate-950 p-3 shadow-xl">
          <form action={updateNotesAction} className="space-y-2">
            <input type="hidden" name="teamId" value={teamId} />
            <textarea
              name="notes"
              defaultValue={notes}
              rows={4}
              placeholder="Team notes…"
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShow(null)}
                className="rounded px-2 py-1 text-xs hover:bg-slate-800"
              >
                Close
              </button>
              <button className="rounded border border-slate-600 px-2 py-1 text-xs hover:border-amber-500">
                Save notes
              </button>
            </div>
          </form>
        </div>
      )}

      {show === "versions" && (
        <div className="absolute right-0 z-20 mt-1 w-72 rounded border border-slate-700 bg-slate-950 p-3 text-sm shadow-xl">
          <ul className="space-y-1">
            {versions.map((v) => (
              <li key={v.versionNumber} className="flex items-center gap-2">
                <span className="font-mono text-amber-400">v{v.versionNumber}</span>
                <span className="flex-1 truncate text-xs text-slate-400">
                  {v.members} mons · {new Date(v.createdAt).toLocaleDateString("en-GB", { timeZone: "UTC" })}
                </span>
                {v.versionNumber !== latest && (
                  <form action={restoreVersionAction}>
                    <input type="hidden" name="teamId" value={teamId} />
                    <input type="hidden" name="versionNumber" value={v.versionNumber} />
                    <button className="rounded border border-slate-700 px-2 py-0.5 text-xs hover:border-amber-500">
                      Restore
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <button
            onClick={() => setShow(null)}
            className="mt-2 rounded px-2 py-1 text-xs hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
