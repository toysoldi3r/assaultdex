"use client";

// Inline base-stats & EVs editor for a member card. Bars use statColor (base
// segment solid, EV segment the same hue but hatched), so a green bar means the
// same thing here as in the overview and the Pokédex. IVs are not edited in the
// Champions format (assumed 31, or 0 where a suggested set wants it); the level
// is fixed at 50.

import { NATURES } from "@/data/fixtures/natures";
import { computeStat } from "@/domain/mechanics/stats";
import { statColor } from "@/domain/mechanics/statColor";
import { STAT_KEYS, type Nature, type StatKey } from "@/domain/types/pokemon";

const EV_STAT_MAX = 252;
const EV_TOTAL_MAX = 508;

const STAT_LABELS: Record<StatKey, string> = {
  hp: "HP", atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe",
};

const clamp = (lo: number, hi: number, v: number) =>
  Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));

const HATCH =
  "repeating-linear-gradient(115deg, rgba(255,255,255,.6) 0 2px, rgba(255,255,255,0) 2px 5px)";

export interface Spread {
  ivs: Record<StatKey, number>;
  evs: Record<StatKey, number>;
}

/** Base (solid) + EV (hatched) segments on a shared track. */
export function StatBar({ base, ev, height = 8 }: { base: number; ev: number; height?: number }) {
  const color = statColor(base);
  const basePct = Math.min(100, (base / 255) * 100);
  // An EV point is a quarter stat point, halved again at level 50 → ev / 8.
  const evPct = Math.min(100 - basePct, ((ev / 8) / 255) * 100);
  return (
    <span className="block overflow-hidden rounded" style={{ height, background: "var(--raise)", borderRadius: 4 }}>
      <span className="flex h-full">
        <span className="h-full" style={{ width: `${basePct}%`, backgroundColor: color }} />
        <span className="h-full" style={{ width: `${evPct}%`, backgroundColor: color, backgroundImage: HATCH }} />
      </span>
    </span>
  );
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
  const neutral = nat.boosted === nat.lowered;
  const totalEv = STAT_KEYS.reduce((s, k) => s + (spread.evs[k] || 0), 0);
  const remaining = EV_TOTAL_MAX - totalEv;
  const baseTotal = STAT_KEYS.reduce((s, k) => s + (base[k] || 0), 0);

  const setEv = (k: StatKey, raw: number) => {
    let v = clamp(0, EV_STAT_MAX, Math.round(raw));
    const others = totalEv - (spread.evs[k] || 0);
    if (others + v > EV_TOTAL_MAX) v = EV_TOTAL_MAX - others;
    onChange({ ...spread, evs: { ...spread.evs, [k]: v } });
  };

  const natureFor = (boost: StatKey, lower: StatKey): Nature["name"] =>
    Object.values(NATURES).find((n) => n.boosted === boost && n.lowered === lower)?.name ?? "Serious";
  const setBoost = (k: StatKey) =>
    k !== "hp" && onNature(natureFor(k === nat.boosted ? nat.lowered : k, nat.lowered));
  const setLower = (k: StatKey) =>
    k !== "hp" && onNature(natureFor(nat.boosted, k === nat.lowered ? nat.boosted : k));

  return (
    <div className="text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] text-t3">
          Nature <span className="text-t1">{nature}</span>
        </span>
        <select
          value={nature}
          onChange={(e) => onNature(e.target.value)}
          className="rounded border border-line bg-bg px-1 py-0.5 text-[11px] text-t1"
        >
          {natures.map((n) => {
            const nn = NATURES[n];
            const tag = nn && nn.boosted !== nn.lowered ? ` (+${nn.boosted} −${nn.lowered})` : " (neutral)";
            return <option key={n} value={n}>{n}{tag}</option>;
          })}
        </select>
      </div>

      <div className="space-y-1">
        {STAT_KEYS.map((k) => {
          const ev = spread.evs[k] || 0;
          const iv = spread.ivs[k] ?? 31;
          const total = computeStat(base[k], iv, ev, level, k, nat);
          const boosted = !neutral && k === nat.boosted;
          const lowered = !neutral && k === nat.lowered;
          return (
            <div key={k} className="grid items-center gap-2" style={{ gridTemplateColumns: "26px 24px 1fr 40px 30px" }}>
              <span className="flex items-center gap-0.5 text-[11px] text-t2">
                {STAT_LABELS[k]}
                {k !== "hp" && (
                  <span className="inline-flex flex-col leading-none">
                    <button type="button" onClick={() => setBoost(k)} title="Nature +10%"
                      className={`text-[9px] leading-none ${boosted ? "text-pos" : "text-t3 hover:text-t1"}`}>+</button>
                    <button type="button" onClick={() => setLower(k)} title="Nature −10%"
                      className={`text-[9px] leading-none ${lowered ? "text-neg" : "text-t3 hover:text-t1"}`}>−</button>
                  </span>
                )}
              </span>
              <span className="text-right text-[11px] tabular-nums text-t3">{base[k]}</span>
              <div className="relative h-2">
                <StatBar base={base[k]} ev={ev} />
                <input
                  type="range" min={0} max={EV_STAT_MAX} step={4} value={ev}
                  onChange={(e) => setEv(k, Number(e.target.value))}
                  aria-label={`${STAT_LABELS[k]} EVs`}
                  className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-1.5 [&::-moz-range-thumb]:rounded [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-t1 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded [&::-webkit-slider-thumb]:bg-t1"
                />
              </div>
              <input
                type="text" inputMode="numeric" value={ev}
                onChange={(e) => {
                  const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                  setEv(k, Number.isNaN(n) ? 0 : n);
                }}
                aria-label={`${STAT_LABELS[k]} EV value`}
                className="w-10 rounded border border-line bg-bg px-1 py-0.5 text-right text-[11px] tabular-nums"
              />
              <span className={`text-right text-[11px] font-semibold tabular-nums ${boosted ? "text-pos" : lowered ? "text-neg" : "text-t1"}`}>{total}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-1 grid items-center gap-2 border-t border-soft pt-1 text-[11px] text-t3" style={{ gridTemplateColumns: "26px 24px 1fr 40px 30px" }}>
        <span>Tot</span>
        <span className="text-right tabular-nums">{baseTotal}</span>
        <span className="text-[10px] uppercase tracking-wide">base stat total</span>
        <span />
        <span />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-t3">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "var(--t2)" }} /> base
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "var(--t2)", backgroundImage: HATCH }} /> EV contribution
        </span>
        {remaining > 0 && <span className="text-warn">{remaining} unspent</span>}
        {remaining < 0 && <span className="text-neg">{-remaining} over cap</span>}
      </div>
    </div>
  );
}
