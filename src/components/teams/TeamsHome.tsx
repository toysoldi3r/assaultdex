"use client";

// Pokémon Showdown-style teambuilder home: folder sidebar, team/box cards with
// sprite icons, search across team names AND the Pokémon inside them, and
// per-card edit / copy (Showdown export) / delete with double-confirm + undo.

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { PokeIcon } from "@/components/PokeIcon";
import { ExportModal } from "@/components/teams/ExportModal";
import {
  createBoxAction,
  createCollectionAction,
  createTeamAction,
  deleteTeamSilentAction,
} from "@/app/teams/actions";

interface Member {
  species: string;
}
export interface TeamCard {
  id: string;
  name: string;
  isBox: boolean;
  collectionId: string | null;
  members: Member[];
}
interface Folder {
  id: string;
  name: string;
}

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

export function TeamsHome({
  teams: initialTeams,
  folders,
}: {
  teams: TeamCard[];
  folders: Folder[];
}) {
  // Hold the list in client state so delete/undo mutate in place (the silent
  // delete action does not revalidate, so nothing here remounts mid-undo).
  const [teams, setTeams] = useState<TeamCard[]>(initialTeams);
  const [folder, setFolder] = useState<string | null>(null); // null=all, "uncat", or id
  const [q, setQ] = useState("");
  // Which team is awaiting a delete confirmation, and which is being exported.
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [exportTeam, setExportTeam] = useState<{ id: string; name: string } | null>(null);
  const [, startTransition] = useTransition();

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    // Species are stored as ids (no spaces/hyphens), so normalise the query too:
    // "flutter mane" and "great-tusk" both match "fluttermane" / "greattusk".
    const speciesNeedle = needle.replace(/[^a-z0-9]/g, "");
    return teams.filter((t) => {
      if (folder === "uncat" && t.collectionId !== null) return false;
      if (folder && folder !== "uncat" && t.collectionId !== folder) return false;
      if (!needle) return true;
      if (t.name.toLowerCase().includes(needle)) return true;
      return (
        speciesNeedle.length > 0 &&
        t.members.some((m) => m.species.toLowerCase().includes(speciesNeedle))
      );
    });
  }, [teams, folder, q]);

  const currentCollectionId = folder && folder !== "uncat" ? folder : "";

  // Delete only after the user confirms on the card. No undo toast - the
  // confirm step is the safety net.
  const doDelete = (t: TeamCard) => {
    setConfirmId(null);
    setTeams((prev) => prev.filter((x) => x.id !== t.id));
    startTransition(async () => {
      await deleteTeamSilentAction(fd({ teamId: t.id }));
    });
  };

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      {/* Sidebar: folders */}
      <aside className="w-full shrink-0 md:w-56">
        <button
          onClick={() => setFolder(null)}
          className={`mb-1 block w-full rounded px-2 py-1 text-left text-sm ${
            folder === null ? "bg-slate-800 text-amber-300" : "hover:bg-slate-800/60"
          }`}
        >
          (all)
        </button>
        <h2 className="mb-1 mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          Folders
        </h2>
        {folders.map((c) => (
          <button
            key={c.id}
            onClick={() => setFolder(c.id)}
            className={`block w-full truncate rounded px-2 py-1 text-left text-sm ${
              folder === c.id ? "bg-slate-800 text-amber-300" : "hover:bg-slate-800/60"
            }`}
          >
            📁 {c.name}
          </button>
        ))}
        <button
          onClick={() => setFolder("uncat")}
          className={`block w-full rounded px-2 py-1 text-left text-sm ${
            folder === "uncat" ? "bg-slate-800 text-amber-300" : "hover:bg-slate-800/60"
          }`}
        >
          📁 (uncategorized)
        </button>
        <form action={createCollectionAction} className="mt-2 flex gap-1">
          <input
            name="name"
            placeholder="add folder…"
            className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
          />
          <button className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700">
            +
          </button>
        </form>
      </aside>

      {/* Main */}
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <form action={createTeamAction}>
            <input type="hidden" name="collectionId" value={currentCollectionId} />
            <button className="rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-black hover:bg-amber-400">
              ＋ New Team
            </button>
          </form>
          <form action={createBoxAction}>
            <input type="hidden" name="collectionId" value={currentCollectionId} />
            <button className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-600">
              ▦ New Box
            </button>
          </form>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search teams or Pokémon…"
            className="min-w-[12rem] flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          />
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-slate-500">No teams here yet.</p>
        ) : (
          <ul className="space-y-2">
            {visible.map((t) => (
              <li
                key={t.id}
                className="flex items-stretch gap-2 rounded-lg border border-slate-800 bg-slate-900/40"
              >
                <Link href={`/teams/${t.id}`} className="min-w-0 flex-1 p-3 hover:bg-slate-800/40">
                  <div className="mb-1 text-sm">
                    <span className="text-slate-500">
                      {t.isBox ? "Box" : "[gen9] Team"}
                    </span>{" "}
                    <span className="font-semibold">{t.name}</span>
                  </div>
                  {t.members.length === 0 ? (
                    <span className="text-xs italic text-slate-600">(empty)</span>
                  ) : (
                    <div className="flex flex-wrap gap-0.5">
                      {t.members.map((m, i) => (
                        <PokeIcon key={i} species={m.species} />
                      ))}
                    </div>
                  )}
                </Link>

                <div className="flex flex-col items-stretch justify-center gap-1 border-l border-slate-800 p-2 text-xs">
                  {confirmId === t.id ? (
                    <>
                      <span className="px-1 text-center text-[11px] font-semibold text-rose-300">Delete “{t.name}”?</span>
                      <button
                        onClick={() => doDelete(t)}
                        className="rounded bg-rose-600 px-2 py-1 font-semibold text-white hover:bg-rose-500"
                      >
                        Yes, delete
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/teams/${t.id}`}
                        className="rounded bg-slate-800 px-2 py-1 text-center hover:bg-slate-700"
                      >
                        ✎ Edit
                      </Link>
                      <button
                        onClick={() => setExportTeam({ id: t.id, name: t.name })}
                        className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700"
                      >
                        ⤓ Export
                      </button>
                      <button
                        onClick={() => setConfirmId(t.id)}
                        className="rounded bg-slate-800 px-2 py-1 text-rose-300 hover:bg-slate-700"
                      >
                        🗑 Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {exportTeam && (
        <ExportModal teamId={exportTeam.id} teamName={exportTeam.name} onClose={() => setExportTeam(null)} />
      )}
    </div>
  );
}
