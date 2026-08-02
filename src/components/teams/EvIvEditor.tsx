"use client";

// EV/IV editor (image 4): per-stat base bar, a typed input and a slider for EVs,
// an IV input, and the computed final stat. Legality is enforced (EV ≤ 252 per
// stat, ≤ 508 total, IV 0–31) and a nature selector applies the ±10% modifier.
// The "Popular spreads" dropdown is wired but empty until usage data exists.

import { NATURES } from "@/data/fixtures/natures";
import { computeStat } from "@/domain/mechanics/stats";
import { STAT_KEYS, type StatKey } from "@/domain/types/pokemon";

const EV_STAT_MAX = 252;
const EV_TOTAL_MAX = 508;

const STAT_LABELS: Record<StatKey, string> = {
  hp: "HP",
  atk: "Attack",
  def: "Defense",
  spa: "Sp. Atk",
  spd: "Sp. Def",
  spe: "Speed",
};

const clamp = (lo: number, hi: number, v: number) =>
  Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));

export interface Spread {
  ivs: Record<StatKey, number>;
  evs: Record<StatKey, number>;
}

export function EvIvEditor({
  base,
  spread,
  level,
  nature,
  natures,
  onChange,
  onNature,
}: {
  base: Record<StatKey, number>;
  spread: Spread;
  level: number;
  nature: string;
  natures: string[];
  onChange: (s: Spread) => void;
  onNature: (n: string) => void;
}) {
  const nat = NATURES[nature] ?? NATURES.Serious!;
  const totalEv = STAT_KEYS.reduce((s, k) => s + (spread.evs[k] || 0), 0);
  const remaining = EV_TOTAL_MAX - totalEv;

  const setEv = (k: StatKey, raw: number) => {
    let v = clamp(0, EV_STAT_MAX, Math.round(raw));
    const others = totalEv - (spread.evs[k] || 0);
    if (others + v > EV_TOTAL_MAX) v = EV_TOTAL_MAX - others; // enforce 508 cap
    onChange({ ...spread, evs: { ...spread.evs, [k]: v } });
  };
  const setIv = (k: StatKey, raw: number) =>
    onChange({ ...spread, ivs: { ...spread.ivs, [k]: clamp(0, 31, Math.round(raw)) } });

  return (
    <div className="mt-3 space-y-2 rounded border border-slate-800 bg-slate-950/40 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold uppercase tracking-wide text-slate-400">
          EV / IV spread
        </span>
        <span className={remaining < 0 ? "text-rose-400" : "text-slate-500"}>
          Remaining EVs: <span className="tabular-nums">{remaining}</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1">
          Nature
          <select
            value={nature}
            onChange={(e) => onNature(e.target.value)}
            className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5"
          >
            {natures.map((n) => {
              const nn = NATURES[n];
              const tag =
                nn && nn.boosted !== nn.lowered
                  ? ` (+${nn.boosted} −${nn.lowered})`
                  : " (neutral)";
              return (
                <option key={n} value={n}>
                  {n}
                  {tag}
                </option>
              );
            })}
          </select>
        </label>
        <label className="flex items-center gap-1 text-slate-500">
          Popular spreads
          <select disabled className="rounded border border-slate-800 bg-slate-900/50 px-1 py-0.5">
            <option>needs usage data</option>
          </select>
        </label>
      </div>

      <table className="w-full">
        <thead className="text-[10px] uppercase text-slate-600">
          <tr>
            <th className="text-left">Stat</th>
            <th className="text-right">Base</th>
            <th className="text-right">IV</th>
            <th className="text-right">EV</th>
            <th></th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {STAT_KEYS.map((k) => {
            const ev = spread.evs[k] || 0;
            const iv = spread.ivs[k] ?? 31;
            const total = computeStat(base[k], iv, ev, level, k, nat);
            const mod =
              k === nat.boosted && nat.boosted !== nat.lowered
                ? "text-emerald-400"
                : k === nat.lowered && nat.boosted !== nat.lowered
                  ? "text-rose-400"
                  : "";
            return (
              <tr key={k} className="border-t border-slate-800/60">
                <td className={`py-1 ${mod}`}>{STAT_LABELS[k]}</td>
                <td className="text-right tabular-nums text-slate-500">{base[k]}</td>
                <td className="text-right">
                  <input
                    type="number"
                    min={0}
                    max={31}
                    value={iv}
                    onChange={(e) => setIv(k, Number(e.target.value))}
                    className="w-12 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-right"
                  />
                </td>
                <td className="text-right">
                  <input
                    type="number"
                    min={0}
                    max={252}
                    step={4}
                    value={ev}
                    onChange={(e) => setEv(k, Number(e.target.value))}
                    className="w-14 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-right"
                  />
                </td>
                <td className="px-2">
                  <input
                    type="range"
                    min={0}
                    max={252}
                    step={4}
                    value={ev}
                    onChange={(e) => setEv(k, Number(e.target.value))}
                    className="w-full align-middle accent-amber-500"
                  />
                </td>
                <td className={`text-right tabular-nums font-semibold ${mod}`}>{total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
