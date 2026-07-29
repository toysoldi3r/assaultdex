"use client";

import { useMemo, useState } from "react";
import { Recommendations } from "./Recommendations";
import { recommend } from "@/domain/choicedex/recommend";
import {
  PROFILE_LABELS,
  type ProfileName,
} from "@/domain/choicedex/scoring";
import type { StatusCondition } from "@/domain/types/battle";
import {
  buildState,
  emptySlot,
  type PokemonRef,
  type SideForm,
  type SlotForm,
  type TurnForm,
} from "@/lib/choicedexBuild";

const PROFILES = Object.keys(PROFILE_LABELS) as ProfileName[];
const WEATHERS = ["none", "sun", "rain", "sand", "snow"] as const;
const TERRAINS = ["none", "electric", "grassy", "misty", "psychic"] as const;
const STATUSES: StatusCondition[] = [
  "none",
  "burn",
  "paralysis",
  "poison",
  "toxic",
  "sleep",
  "freeze",
];
const STAGE_KEYS = ["atk", "def", "spa", "spd", "spe"] as const;

function side(slot0: string, slot1: string): SideForm {
  return { slots: [emptySlot(slot0), emptySlot(slot1)], tailwind: false };
}

export function BattleEditor({ pokemon }: { pokemon: PokemonRef[] }) {
  const refBySlug = useMemo(
    () => new Map(pokemon.map((p) => [p.slug, p])),
    [pokemon],
  );
  const options = pokemon.map((p) => ({ slug: p.slug, name: p.name }));
  const d = (i: number) => options[i % options.length]?.slug ?? "";

  const [form, setForm] = useState<TurnForm>({
    user: side(d(0), d(1)),
    opponent: side(d(2), d(3)),
    weather: "none",
    terrain: "none",
    trickRoom: false,
    note: "",
  });
  const [history, setHistory] = useState<TurnForm[]>([]);
  const [profile, setProfile] = useState<ProfileName>("balanced");

  const state = useMemo(() => buildState(form, refBySlug), [form, refBySlug]);
  const recommendations = useMemo(
    () => (state ? recommend(state, { profile, limit: 5 }) : []),
    [state, profile],
  );

  function patchSlot(
    sideKey: "user" | "opponent",
    idx: 0 | 1,
    patch: Partial<SlotForm>,
  ) {
    setForm((f) => {
      const slots = [...f[sideKey].slots] as [SlotForm, SlotForm];
      slots[idx] = { ...slots[idx], ...patch };
      return { ...f, [sideKey]: { ...f[sideKey], slots } };
    });
  }

  function setStage(
    sideKey: "user" | "opponent",
    idx: 0 | 1,
    key: (typeof STAGE_KEYS)[number],
    delta: number,
  ) {
    setForm((f) => {
      const slots = [...f[sideKey].slots] as [SlotForm, SlotForm];
      const cur = slots[idx].stages[key];
      const next = Math.max(-6, Math.min(6, cur + delta));
      slots[idx] = {
        ...slots[idx],
        stages: { ...slots[idx].stages, [key]: next },
      };
      return { ...f, [sideKey]: { ...f[sideKey], slots } };
    });
  }

  const recordTurn = () => setHistory((h) => [...h, form]);
  const undo = () =>
    setHistory((h) => {
      if (h.length === 0) return h;
      setForm(h[h.length - 1]!);
      return h.slice(0, -1);
    });
  const loadTurn = (i: number) => setForm(history[i]!);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <SideEditor
          title="Your side"
          sideKey="user"
          form={form}
          options={options}
          onSlot={patchSlot}
          onStage={setStage}
          onTailwind={(v) =>
            setForm((f) => ({ ...f, user: { ...f.user, tailwind: v } }))
          }
        />
        <SideEditor
          title="Opponent side"
          sideKey="opponent"
          form={form}
          options={options}
          onSlot={patchSlot}
          onStage={setStage}
          onTailwind={(v) =>
            setForm((f) => ({ ...f, opponent: { ...f.opponent, tailwind: v } }))
          }
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded border border-slate-800 p-3 text-xs text-slate-400">
        <label>
          Weather
          <select
            value={form.weather}
            onChange={(e) =>
              setForm((f) => ({ ...f, weather: e.target.value as TurnForm["weather"] }))
            }
            className="ml-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            {WEATHERS.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </label>
        <label>
          Terrain
          <select
            value={form.terrain}
            onChange={(e) =>
              setForm((f) => ({ ...f, terrain: e.target.value as TurnForm["terrain"] }))
            }
            className="ml-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            {TERRAINS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={form.trickRoom}
            onChange={(e) => setForm((f) => ({ ...f, trickRoom: e.target.checked }))}
          />
          Trick Room
        </label>
        <label className="ml-auto">
          Profile
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value as ProfileName)}
            className="ml-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            {PROFILES.map((p) => (
              <option key={p} value={p}>
                {PROFILE_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!state && (
        <p className="text-sm text-rose-400">
          Select a valid Pokémon in every slot.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={recordTurn}
          className="rounded bg-amber-500 px-3 py-1 font-semibold text-black hover:bg-amber-400"
        >
          Record turn
        </button>
        <button
          onClick={undo}
          disabled={history.length === 0}
          className="rounded border border-slate-600 px-3 py-1 hover:border-amber-500 disabled:opacity-40"
        >
          Undo
        </button>
        <input
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          placeholder="Turn note (e.g. what happened)"
          className="min-w-[12rem] flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
        />
      </div>

      {history.length > 0 && (
        <div className="rounded border border-slate-800 p-3">
          <p className="mb-1 text-xs uppercase text-slate-500">
            Turn history — click to return to an earlier turn
          </p>
          <ol className="space-y-1 text-xs">
            {history.map((h, i) => (
              <li key={i}>
                <button
                  onClick={() => loadTurn(i)}
                  className="text-amber-400 hover:underline"
                >
                  Turn {i + 1}
                </button>{" "}
                <span className="text-slate-500">
                  {h.user.slots.map((s) => s.species).join(" + ")} vs{" "}
                  {h.opponent.slots.map((s) => s.species).join(" + ")}
                  {h.note ? ` — ${h.note}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Recommendations
        </h2>
        <Recommendations
          recommendations={recommendations}
          profileLabel={PROFILE_LABELS[profile]}
        />
      </div>
    </div>
  );
}

function SideEditor({
  title,
  sideKey,
  form,
  options,
  onSlot,
  onStage,
  onTailwind,
}: {
  title: string;
  sideKey: "user" | "opponent";
  form: TurnForm;
  options: { slug: string; name: string }[];
  onSlot: (s: "user" | "opponent", idx: 0 | 1, patch: Partial<SlotForm>) => void;
  onStage: (
    s: "user" | "opponent",
    idx: 0 | 1,
    key: (typeof STAGE_KEYS)[number],
    delta: number,
  ) => void;
  onTailwind: (v: boolean) => void;
}) {
  const sideForm = form[sideKey];
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </h3>
        <label className="flex items-center gap-1 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={sideForm.tailwind}
            onChange={(e) => onTailwind(e.target.checked)}
          />
          Tailwind
        </label>
      </div>
      <div className="space-y-2">
        {[0, 1].map((raw) => {
          const idx = raw as 0 | 1;
          const slot = sideForm.slots[idx];
          return (
            <div key={idx} className="rounded border border-slate-800 p-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={slot.species}
                  onChange={(e) => onSlot(sideKey, idx, { species: e.target.value })}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                >
                  {options.map((o) => (
                    <option key={o.slug} value={o.slug}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <label className="text-slate-400">
                  HP%
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={slot.hpPct}
                    onChange={(e) =>
                      onSlot(sideKey, idx, { hpPct: Number(e.target.value) })
                    }
                    className="ml-1 w-16 rounded border border-slate-700 bg-slate-900 px-1 py-1 text-slate-100"
                  />
                </label>
                <select
                  value={slot.status}
                  onChange={(e) =>
                    onSlot(sideKey, idx, {
                      status: e.target.value as StatusCondition,
                    })
                  }
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500">
                {STAGE_KEYS.map((k) => (
                  <span key={k} className="flex items-center gap-0.5">
                    {k}
                    <button
                      type="button"
                      aria-label={`Lower ${k} stage`}
                      onClick={() => onStage(sideKey, idx, k, -1)}
                      className="rounded bg-slate-800 px-1 hover:bg-slate-700"
                    >
                      −
                    </button>
                    <span className="w-4 text-center tabular-nums text-slate-300">
                      {slot.stages[k] > 0 ? `+${slot.stages[k]}` : slot.stages[k]}
                    </span>
                    <button
                      type="button"
                      aria-label={`Raise ${k} stage`}
                      onClick={() => onStage(sideKey, idx, k, 1)}
                      className="rounded bg-slate-800 px-1 hover:bg-slate-700"
                    >
                      +
                    </button>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
