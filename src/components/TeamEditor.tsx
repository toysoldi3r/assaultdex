"use client";

import { useActionState } from "react";
import { saveVersionAction } from "@/app/teams/actions";
import { EMPTY_SAVE_STATE, type SaveVersionState } from "@/app/teams/saveState";
import { STAT_KEYS, type PokemonSet, type StatKey } from "@/domain/types/pokemon";

export interface EditorMember {
  species: string;
  name: string;
  legalMoves: string[];
  set: PokemonSet;
}

const STAT_LABELS: Record<StatKey, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

function issuesFor(state: SaveVersionState, index: number) {
  return [
    ...state.errors.filter((e) => e.memberIndex === index),
    ...state.warnings.filter((w) => w.memberIndex === index),
  ];
}

export function TeamEditor({
  teamId,
  members,
  natures,
}: {
  teamId: string;
  members: EditorMember[];
  natures: string[];
}) {
  const [state, formAction, pending] = useActionState(
    saveVersionAction,
    EMPTY_SAVE_STATE,
  );

  const teamErrors = state.errors.filter((e) => e.memberIndex === null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="memberCount" value={members.length} />

      <div className="flex items-center gap-3">
        <input
          name="label"
          placeholder="Version label (optional)"
          className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="whitespace-nowrap rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {pending ? "Validating…" : "Validate & save version"}
        </button>
      </div>

      {state.message && (
        <p
          className={`text-sm ${state.ok ? "text-emerald-400" : "text-rose-400"}`}
        >
          {state.message}
        </p>
      )}
      {teamErrors.length > 0 && (
        <ul className="list-disc pl-5 text-xs text-rose-400">
          {teamErrors.map((e, i) => (
            <li key={i}>{e.message}</li>
          ))}
        </ul>
      )}

      <div className="space-y-3">
        {members.map((m, i) => {
          const issues = issuesFor(state, i);
          return (
            <fieldset
              key={m.species}
              className="rounded border border-slate-800 p-3"
            >
              <legend className="px-1 text-sm font-semibold">{m.name}</legend>
              <input type="hidden" name={`species_${i}`} value={m.species} />

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="text-xs text-slate-400">
                  Level
                  <input
                    type="number"
                    name={`level_${i}`}
                    defaultValue={m.set.level}
                    min={1}
                    max={100}
                    className="mt-0.5 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Ability
                  <input
                    name={`ability_${i}`}
                    defaultValue={m.set.ability ?? ""}
                    className="mt-0.5 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Item
                  <input
                    name={`item_${i}`}
                    defaultValue={m.set.item ?? ""}
                    className="mt-0.5 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Nature
                  <select
                    name={`nature_${i}`}
                    defaultValue={m.set.nature}
                    className="mt-0.5 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  >
                    {natures.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[0, 1, 2, 3].map((j) => (
                  <label key={j} className="text-xs text-slate-400">
                    Move {j + 1}
                    <select
                      name={`move_${i}_${j}`}
                      defaultValue={m.set.moves[j] ?? ""}
                      className="mt-0.5 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                    >
                      <option value="">—</option>
                      {m.legalMoves.map((mv) => (
                        <option key={mv} value={mv}>
                          {mv}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

              <div className="mt-2">
                <p className="text-xs uppercase text-slate-500">EVs</p>
                <div className="grid grid-cols-6 gap-1">
                  {STAT_KEYS.map((k) => (
                    <label key={k} className="text-[10px] text-slate-500">
                      {STAT_LABELS[k]}
                      <input
                        type="number"
                        name={`ev_${i}_${k}`}
                        defaultValue={m.set.spread.evs[k]}
                        min={0}
                        max={252}
                        className="mt-0.5 w-full rounded border border-slate-700 bg-slate-900 px-1 py-1 text-xs text-slate-100"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-slate-500">
                  IVs
                </summary>
                <div className="mt-1 grid grid-cols-6 gap-1">
                  {STAT_KEYS.map((k) => (
                    <label key={k} className="text-[10px] text-slate-500">
                      {STAT_LABELS[k]}
                      <input
                        type="number"
                        name={`iv_${i}_${k}`}
                        defaultValue={m.set.spread.ivs[k]}
                        min={0}
                        max={31}
                        className="mt-0.5 w-full rounded border border-slate-700 bg-slate-900 px-1 py-1 text-xs text-slate-100"
                      />
                    </label>
                  ))}
                </div>
              </details>

              {issues.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs">
                  {issues.map((e, k) => (
                    <li
                      key={k}
                      className={
                        state.errors.includes(e)
                          ? "text-rose-400"
                          : "text-amber-300"
                      }
                    >
                      {e.field}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
          );
        })}
      </div>
    </form>
  );
}
